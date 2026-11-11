import RoomStream from "@/components/RoomStream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export default function Room() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex h-[calc(100svh-9.5rem)] max-w-[1100px] flex-col p-3 sm:p-6 lg:h-[calc(100svh-3rem)]">
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg" data-testid="room-title">
            {t("room.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
          <RoomStream full />
        </CardContent>
      </Card>
    </div>
  );
}
