import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetRoom,
  useListProblems,
  useGetRoomStats,
  useCreateProblem,
  useVoteProblem,
  getGetRoomQueryKey,
  getListProblemsQueryKey,
  getGetRoomStatsQueryKey,
} from "@/lib/queries";
import { getVoterToken, getAuthorName } from "@/lib/auth";
import { AuthorNameDialog } from "@/components/AuthorNameDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown, MessageCircle, Plus, Copy, Hash, Users, Activity, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RoomView() {
  const { roomId } = useParams();
  const id = parseInt(roomId || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAuthorDialog, setShowAuthorDialog] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: room, isLoading: isLoadingRoom } = useGetRoom(id, { query: { enabled: !!id, queryKey: getGetRoomQueryKey(id) } });
  const { data: problems, isLoading: isLoadingProblems } = useListProblems(id, { query: { enabled: !!id, queryKey: getListProblemsQueryKey(id) } });
  const { data: stats } = useGetRoomStats(id, { query: { enabled: !!id, queryKey: getGetRoomStatsQueryKey(id) } });

  const createProblem = useCreateProblem();
  const voteProblem = useVoteProblem();
  const voterToken = getVoterToken();

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListProblemsQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetRoomStatsQueryKey(id) });
    }, 10000);
    return () => clearInterval(interval);
  }, [id, queryClient]);

  const handleCopyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      toast({ title: "تم النسخ", description: "تم نسخ رمز الغرفة" });
    }
  };

  const handleAddProblem = (e: React.FormEvent) => {
    e.preventDefault();
    const authorName = getAuthorName();
    if (!authorName) { setShowAuthorDialog(true); return; }
    if (!newTitle.trim() || !newDesc.trim()) return;

    createProblem.mutate(
      { roomId: id, data: { title: newTitle.trim(), description: newDesc.trim(), authorName } },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setNewTitle("");
          setNewDesc("");
          queryClient.invalidateQueries({ queryKey: getListProblemsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetRoomStatsQueryKey(id) });
          toast({ title: "تمت الإضافة", description: "تمت إضافة المشكلة بنجاح" });
        },
      }
    );
  };

  const handleVote = (problemId: number, voteType: "like" | "dislike") => {
    voteProblem.mutate(
      { problemId, data: { voteType, voterToken } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProblemsQueryKey(id) }) }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 10) return "bg-emerald-500 text-white";
    if (score >= 5) return "bg-teal-500 text-white";
    if (score >= 1) return "bg-primary/80 text-white";
    if (score < 0) return "bg-rose-400 text-white";
    return "bg-muted text-muted-foreground";
  };

  if (isLoadingRoom) {
    return (
      <div className="p-4 space-y-3 max-w-2xl mx-auto pt-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        {[1,2,3].map(i => <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />)}
      </div>
    );
  }

  if (!room) {
    return <div className="p-8 text-center text-destructive font-bold text-lg">الغرفة غير موجودة</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-8">
      <AuthorNameDialog
        open={showAuthorDialog}
        onOpenChange={setShowAuthorDialog}
        onNameSet={() => setIsAddOpen(true)}
      />

      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <Link href="/">
                <button className="mt-0.5 p-1 hover:bg-white/20 rounded-lg transition-colors shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg font-black leading-tight truncate">{room.name}</h1>
                <div className="flex items-center gap-1.5 mt-1 opacity-80">
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span dir="ltr" className="font-mono text-sm tracking-widest font-bold">{room.code}</span>
                  <button onClick={handleCopyCode} className="p-1 hover:bg-white/20 rounded transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-white text-primary hover:bg-white/90 font-black text-xs gap-1.5 h-8 shadow-sm shrink-0"
                  onClick={(e) => { if (!getAuthorName()) { e.preventDefault(); setShowAuthorDialog(true); } }}
                >
                  <Plus className="w-3.5 h-3.5" /> مشكلة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black">طرح مشكلة جديدة</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddProblem} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-muted-foreground">عنوان المشكلة</label>
                    <Input placeholder="مثال: تأخر الطلاب عند الحضور" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="text-base font-semibold h-11" maxLength={100} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-muted-foreground">تفاصيل المشكلة</label>
                    <Textarea placeholder="صِف المشكلة بتفاصيل أوضح..." value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="min-h-[110px] resize-none" />
                  </div>
                  <Button type="submit" className="w-full h-11 font-bold" disabled={!newTitle.trim() || !newDesc.trim() || createProblem.isPending}>
                    طرح للنقاش
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats bar */}
          {stats && (
            <div className="mt-3 grid grid-cols-3 gap-2 bg-white/10 rounded-xl p-2 text-center">
              <div>
                <p className="font-black text-base leading-none">{stats.totalProblems}</p>
                <p className="text-[10px] opacity-75 mt-0.5">مشكلة</p>
              </div>
              <div className="border-x border-white/20">
                <p className="font-black text-base leading-none">{stats.totalSolutions}</p>
                <p className="text-[10px] opacity-75 mt-0.5">حل مقترح</p>
              </div>
              <div>
                <p className="font-black text-base leading-none">{stats.totalVotes}</p>
                <p className="text-[10px] opacity-75 mt-0.5">تفاعل</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Problems */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            مرتّبة حسب الأعلى تصويتاً
          </p>
          {problems && problems.length > 0 && (
            <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-3 py-1">
              {problems.length} مشكلة
            </span>
          )}
        </div>

        {isLoadingProblems ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />)}
          </div>
        ) : problems?.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-card border border-dashed">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <p className="font-bold text-foreground mb-1">لا توجد مشكلات مطروحة بعد</p>
            <p className="text-sm text-muted-foreground mb-5">شارك أول مشكلة في هذا الاجتماع</p>
            <Button onClick={() => { if (!getAuthorName()) setShowAuthorDialog(true); else setIsAddOpen(true); }} className="font-bold">
              <Plus className="w-4 h-4 ml-1" /> طرح أول مشكلة
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {problems?.map((problem, index) => {
              const score = problem.likesCount - problem.dislikesCount;
              const isTop = index === 0;
              return (
                <div
                  key={problem.id}
                  className={`bg-card rounded-2xl border transition-all duration-150 hover:shadow-md hover:-translate-y-px group ${isTop ? "border-primary/30 shadow-sm shadow-primary/10" : "border-border shadow-sm"}`}
                >
                  <div className="flex items-stretch gap-0">
                    <div className="flex flex-col items-center justify-center px-3 py-4 gap-1.5 shrink-0 border-l border-border/60">
                      <button onClick={() => handleVote(problem.id, "like")} className="p-1.5 rounded-xl hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <span className={`text-xs font-black min-w-[24px] text-center py-0.5 px-1.5 rounded-lg ${getScoreColor(score)}`}>
                        {score}
                      </span>
                      <button onClick={() => handleVote(problem.id, "dislike")} className="p-1.5 rounded-xl hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-colors">
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                    <Link href={`/problem/${problem.id}`} className="flex-1 min-w-0 px-4 py-4 block">
                      {isTop && (
                        <span className="inline-block text-[10px] font-black text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-2 leading-none">
                          الأعلى تصويتاً
                        </span>
                      )}
                      <h3 className="font-bold text-[15px] text-foreground leading-snug group-hover:text-primary transition-colors">
                        {problem.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground font-medium">{problem.authorName}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageCircle className="w-3 h-3" />{problem.solutionsCount} حل
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <ThumbsUp className="w-3 h-3" />{problem.likesCount}
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
