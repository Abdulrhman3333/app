import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useCreateRoom, useJoinRoom } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogIn, ChevronRight, Lock, Globe } from "lucide-react";

export default function Rooms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createRoom = useCreateRoom();

  const [joinCode, setJoinCode] = useState("");
  const { refetch: joinRoomRefetch, isFetching: isJoining } = useJoinRoom(joinCode, {
    query: { enabled: false, retry: false, queryKey: ["joinRoom", joinCode] },
  });

  const [createName, setCreateName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [createCode, setCreateCode] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const result = await joinRoomRefetch();
      if (result.data) {
        setLocation(`/room/${result.data.id}`);
      } else {
        toast({ title: "رمز غير صحيح", description: "لم يتم العثور على الغرفة، تحقق من الرمز", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ، حاول مجدداً", variant: "destructive" });
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;
    if (isPrivate && !createCode.trim()) {
      toast({ title: "رمز مطلوب", description: "يرجى إدخال رمز للغرفة الخاصة", variant: "destructive" });
      return;
    }
    createRoom.mutate(
      { data: { name: createName.trim(), isPrivate, code: isPrivate ? createCode.trim() : null } },
      {
        onSuccess: (room) => setLocation(`/room/${room.id}`),
        onError: () => toast({ title: "فشل إنشاء الغرفة", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <button className="p-1.5 hover:bg-white/20 rounded-xl transition-colors" data-testid="button-back-home">
              <ChevronRight className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-lg font-black leading-none">غرف الاجتماعات</h1>
            <p className="text-[11px] mt-0.5 opacity-70 font-medium">اجتماع خاص بمجموعتك</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {/* Description */}
        <div className="bg-card rounded-2xl border border-border p-4 mb-6 shadow-sm">
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            الغرف مخصصة للاجتماعات الخاصة — أنشئ غرفة لمجموعتك وشارك الرمز مع زملائك، أو انضم لغرفة موجودة.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <Tabs defaultValue="join" className="w-full">
            <div className="px-4 pt-4 pb-0">
              <TabsList className="w-full grid grid-cols-2 rounded-xl">
                <TabsTrigger value="join" className="rounded-lg font-bold text-sm" data-testid="tab-join">
                  <LogIn className="w-3.5 h-3.5 ml-1.5" /> انضمام
                </TabsTrigger>
                <TabsTrigger value="create" className="rounded-lg font-bold text-sm" data-testid="tab-create">
                  <Plus className="w-3.5 h-3.5 ml-1.5" /> إنشاء
                </TabsTrigger>
              </TabsList>
            </div>

            {/* JOIN */}
            <TabsContent value="join" className="p-5 pt-4">
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-sm">رمز الغرفة</Label>
                  <Input
                    placeholder="أدخل الرمز..."
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="text-center text-2xl tracking-[0.35em] h-14 font-mono rounded-xl border-border/80 focus:border-primary"
                    dir="ltr"
                    maxLength={10}
                    data-testid="input-join-code"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 font-black text-base rounded-xl"
                  disabled={!joinCode.trim() || isJoining}
                  data-testid="button-join-room"
                >
                  <LogIn className="w-4 h-4 ml-2" />
                  دخول للاجتماع
                </Button>
              </form>
            </TabsContent>

            {/* CREATE */}
            <TabsContent value="create" className="p-5 pt-4">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-sm">اسم الاجتماع</Label>
                  <Input
                    placeholder="مثال: اجتماع قسم الرياضيات"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="h-12 text-base rounded-xl border-border/80 focus:border-primary"
                    data-testid="input-room-name"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/40">
                  <div className="flex items-center gap-2.5">
                    {isPrivate ? (
                      <Lock className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-bold">{isPrivate ? "غرفة خاصة" : "غرفة عامة"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isPrivate ? "تتطلب رمزاً للدخول" : "يمكن للجميع الانضمام"}
                      </p>
                    </div>
                  </div>
                  <Switch checked={isPrivate} onCheckedChange={setIsPrivate} data-testid="switch-private" />
                </div>

                {isPrivate && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Label className="font-bold text-sm">الرمز السري</Label>
                    <Input
                      placeholder="اختر رمزاً سهل الحفظ"
                      value={createCode}
                      onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                      className="text-center text-xl tracking-widest h-12 font-mono rounded-xl border-border/80 focus:border-primary"
                      dir="ltr"
                      maxLength={10}
                      data-testid="input-room-code"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 font-black text-base rounded-xl"
                  disabled={!createName.trim() || createRoom.isPending}
                  data-testid="button-create-room"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  بدء الاجتماع
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
