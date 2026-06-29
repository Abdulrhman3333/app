import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useListPublicProblems,
  getListPublicProblemsQueryKey,
  useCreatePublicProblem,
  useVoteProblem,
} from "@/lib/queries";
import { getVoterToken, getAuthorName } from "@/lib/auth";
import { AuthorNameDialog } from "@/components/AuthorNameDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ThumbsUp, ThumbsDown, MessageCircle, Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAuthorDialog, setShowAuthorDialog] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: problems, isLoading } = useListPublicProblems({
    query: { queryKey: getListPublicProblemsQueryKey() },
  });
  const createProblem = useCreatePublicProblem();
  const voteProblem = useVoteProblem();
  const voterToken = getVoterToken();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListPublicProblemsQueryKey() });
    }, 10000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleAddProblem = (e: React.FormEvent) => {
    e.preventDefault();
    const authorName = getAuthorName();
    if (!authorName) { setShowAuthorDialog(true); return; }
    if (!newTitle.trim() || !newDesc.trim()) return;

    createProblem.mutate(
      { data: { title: newTitle.trim(), description: newDesc.trim(), authorName } },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setNewTitle("");
          setNewDesc("");
          queryClient.invalidateQueries({ queryKey: getListPublicProblemsQueryKey() });
          toast({ title: "تمت الإضافة", description: "تمت إضافة مشكلتك للمنصة" });
        },
      }
    );
  };

  const handleVote = (problemId: number, voteType: "like" | "dislike") => {
    voteProblem.mutate(
      { problemId, data: { voteType, voterToken } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListPublicProblemsQueryKey() }) }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 10) return "bg-emerald-500 text-white";
    if (score >= 5) return "bg-teal-500 text-white";
    if (score >= 1) return "bg-primary/80 text-white";
    if (score < 0) return "bg-rose-400 text-white";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <AuthorNameDialog
        open={showAuthorDialog}
        onOpenChange={setShowAuthorDialog}
        onNameSet={() => setIsAddOpen(true)}
      />

      {/* ── Header ── */}
      <header className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">مشكلة وحل</h1>
            <p className="text-[11px] mt-0.5 opacity-70 font-medium">منصة المعلمين التعاونية</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/rooms">
              <Button
                size="sm"
                className="bg-white/15 hover:bg-white/25 text-white border-0 font-bold text-xs gap-1.5 h-8"
                data-testid="button-rooms"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">غرف الاجتماعات</span>
                <span className="sm:hidden">غرف</span>
              </Button>
            </Link>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-white text-primary hover:bg-white/90 font-black text-xs gap-1.5 h-8 shadow-sm"
                  data-testid="button-add-problem"
                  onClick={(e) => {
                    if (!getAuthorName()) { e.preventDefault(); setShowAuthorDialog(true); }
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  مشكلة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black">طرح مشكلة للمنصة</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddProblem} className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-muted-foreground">عنوان المشكلة</label>
                    <Input
                      placeholder="مثال: تأخر الطلاب عند الحضور"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="text-base font-semibold h-11"
                      maxLength={100}
                      data-testid="input-problem-title"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-muted-foreground">تفاصيل المشكلة</label>
                    <Textarea
                      placeholder="صِف المشكلة بتفاصيل أوضح حتى يتمكن الآخرون من فهمها..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="min-h-[120px] resize-none text-sm leading-relaxed"
                      data-testid="input-problem-description"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-bold text-base"
                    disabled={!newTitle.trim() || !newDesc.trim() || createProblem.isPending}
                    data-testid="button-submit-problem"
                  >
                    طرح للنقاش
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* ── Feed ── */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Subheader */}
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

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && problems?.length === 0 && (
          <div className="text-center py-20 rounded-2xl bg-card border border-dashed border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <p className="font-bold text-foreground mb-1">لا توجد مشكلات مطروحة بعد</p>
            <p className="text-sm text-muted-foreground mb-5">كن أول من يشارك تحدياته مع زملائه</p>
            <Button
              onClick={() => { if (!getAuthorName()) setShowAuthorDialog(true); else setIsAddOpen(true); }}
              data-testid="button-first-problem"
              className="font-bold"
            >
              <Plus className="w-4 h-4 ml-1" />
              طرح أول مشكلة
            </Button>
          </div>
        )}

        {/* Problem cards */}
        {!isLoading && problems && problems.length > 0 && (
          <div className="space-y-3">
            {problems.map((problem, index) => {
              const score = problem.likesCount - problem.dislikesCount;
              const isTop = index === 0;
              return (
                <div
                  key={problem.id}
                  className={`bg-card rounded-2xl border transition-all duration-150 hover:shadow-md hover:-translate-y-px group ${
                    isTop
                      ? "border-primary/30 shadow-sm shadow-primary/10"
                      : "border-border shadow-sm"
                  }`}
                  data-testid={`card-problem-${problem.id}`}
                >
                  <div className="flex items-stretch gap-0">
                    {/* Score column */}
                    <div className="flex flex-col items-center justify-center px-3 py-4 gap-1.5 shrink-0 border-l border-border/60">
                      <button
                        onClick={() => handleVote(problem.id, "like")}
                        className="p-1.5 rounded-xl hover:bg-emerald-50 text-muted-foreground hover:text-emerald-600 transition-colors"
                        data-testid={`button-like-problem-${problem.id}`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <span className={`text-xs font-black min-w-[24px] text-center py-0.5 px-1.5 rounded-lg ${getScoreColor(score)}`}>
                        {score}
                      </span>
                      <button
                        onClick={() => handleVote(problem.id, "dislike")}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-muted-foreground hover:text-rose-500 transition-colors"
                        data-testid={`button-dislike-problem-${problem.id}`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <Link
                      href={`/problem/${problem.id}`}
                      className="flex-1 min-w-0 px-4 py-4 block"
                      data-testid={`link-problem-${problem.id}`}
                    >
                      {isTop && (
                        <span className="inline-block text-[10px] font-black text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-2 leading-none">
                          الأعلى تصويتاً
                        </span>
                      )}
                      <h3 className="font-bold text-[15px] text-foreground leading-snug group-hover:text-primary transition-colors">
                        {problem.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground font-medium">
                          {problem.authorName}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageCircle className="w-3 h-3" />
                          <span>{problem.solutionsCount} حل</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <ThumbsUp className="w-3 h-3" />
                          {problem.likesCount}
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
