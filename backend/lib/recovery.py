"""Recover persisted work that was interrupted by a backend restart."""

import logging

from lib.db import db
from lib.orchestrator import (
    complete_review_effects,
    remember,
    run_mission,
    spawn,
    start_mission,
    zero_direct_reply,
    zero_reply_in_room,
)

logger = logging.getLogger(__name__)


async def recover_incomplete_work() -> None:
    """Clear leases owned by the previous process and resume incomplete work."""
    await db.missions.update_many(
        {"status": {"$in": ["planning", "delegating"]}},
        {"$unset": {"runner_id": "", "lease_until": ""}},
    )
    await db.visual_missions.update_many(
        {"status": {"$in": ["queued", "running"]}},
        {"$unset": {"runner_id": "", "lease_until": ""}},
    )
    await db.room_messages.update_many(
        {"sender_key": "user", "reply_status": "working"},
        {"$set": {"reply_status": "pending"}, "$unset": {"reply_lease_until": ""}},
    )
    await db.zero_messages.update_many(
        {"role": "user", "reply_status": "working"},
        {"$set": {"reply_status": "pending"}, "$unset": {"reply_lease_until": ""}},
    )

    missions = await db.missions.find(
        {"status": {"$in": ["planning", "delegating"]}},
        {"id": 1, "_id": 0},
    ).limit(100).to_list(100)
    visual_missions = await db.visual_missions.find(
        {"status": {"$in": ["queued", "running"]}},
        {"id": 1, "_id": 0},
    ).limit(100).to_list(100)
    pending_reviews = await db.tasks.find({"review_effects": "pending"}).limit(100).to_list(100)
    reserved_proposals = await db.zero_messages.find(
        {
            "mission_id": {"$type": "string", "$ne": ""},
            "proposal": {"$type": "string", "$ne": ""},
        }
    ).limit(100).to_list(100)
    pending_room_replies = await db.room_messages.find(
        {"sender_key": "user", "reply_status": "pending"},
        {"id": 1, "_id": 0},
    ).limit(100).to_list(100)
    pending_zero_replies = await db.zero_messages.find(
        {"role": "user", "reply_status": "pending"},
        {"id": 1, "_id": 0},
    ).limit(100).to_list(100)

    for message in reserved_proposals:
        mission_id = message["mission_id"]
        if not await db.missions.find_one({"id": mission_id}, {"_id": 1}):
            await start_mission(message["proposal"], message.get("project_id"), mission_id=mission_id)
        await remember(
            "decisao_chefe",
            message["proposal"][:120],
            message["proposal"],
            "Proposta do Zero aprovada pelo Chefe",
            message.get("project_id"),
            memory_id=f"proposal-{message['id']}",
        )

    if visual_missions:
        from routers.visual import run_visual_mission

        for mission in visual_missions:
            spawn(run_visual_mission(mission["id"]))
    for mission in missions:
        spawn(run_mission(mission["id"]))
    for task in pending_reviews:
        spawn(complete_review_effects(task))
    for message in pending_room_replies:
        spawn(zero_reply_in_room(message["id"]))
    for message in pending_zero_replies:
        spawn(zero_direct_reply(message["id"]))

    if missions or visual_missions or pending_reviews or pending_room_replies or pending_zero_replies:
        logger.info(
            "startup recovery queued %s mission(s), %s visual mission(s), %s review effect(s), and %s reply job(s)",
            len(missions),
            len(visual_missions),
            len(pending_reviews),
            len(pending_room_replies) + len(pending_zero_replies),
        )