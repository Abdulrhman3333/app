import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProblem,
  useListSolutions,
  useCreateSolution,
  useVoteSolution,
  useVoteProblem,
  useDeleteProblem,
  useDeleteSolution,
  getGetProblemQueryKey,
  getListSolutionsQueryKey,
} from "@/lib/queries";
import { getVoterToken, getAuthorName } from "@/lib/auth";
import { AuthorNameDialog } from "@/components/AuthorNameDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, ThumbsUp, ThumbsDown, MessageSquare, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export default function ProblemDetail() {
  const { problemId } = useParams();
  const id = parseInt(problemId || "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [showAuthorDialog, setShowAuthorDialog] = useState(false);
  const [newSolution, setNewSolution] = useState("");

  const { data: problem, isLoading: isLoadingProblem } = useGetProblem(id, { query: { enabled: !!id, queryKey: getGetProblemQueryKey(id) } });
  const { data: solutions, isLoading: isLoadingSolutions } = useListSolutions(id, { query: { enabled: !!id, queryKey: getListSolutionsQueryKey(id) } });

  const createSolution = useCreateSolution();
  const voteSolution = useVoteSolution();
  const voteProblem = useVoteProblem();
  const deleteProblem = useDeleteProblem();
  const deleteSolution = useDeleteSolution();

  const voterToken = getVoterToken();
  const currentAuthorName = getAuthorName();

  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetProblemQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getListSolutionsQueryKey(id) });
    }, 10000);
    return () => clearInterval(interval);
  }, [id, queryClient]);

  const handleVoteProblem = (voteType: "like" | "dislike") => {
    voteProblem.mutate({ problemId: id, data: { voteType, voterToken } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProblemQueryKey(id) }),
    });
  };

  const handleVoteSolution = (solutionId: number, voteType: "like" | "dislike") => {
    voteSolution.mutate({ solutionId, data: { voteType, voterToken } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListSolutionsQueryKey(id) }),
    });
  };

  const handleAddSolution = () => {
    if (!currentAuthorName) { setShowAuthorDialog(true); return; }
    if (!newSolution.trim()) return;
    createSolution.mutate(
      { problemId: id, data: { content: newSolution.trim(), authorName: currentAuthorName } },
      {
        onSuccess: () => {
          setNewSolution("");
          queryClient.invalidateQueries({ queryKey: getListSolutionsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetProblemQueryKey(id) });
          toast({ title: "تمت الإضافة", description: "تمت إضافة حلك بنجاح" });
        },
      }
    );
  };

  const handleDeleteProblem = () => {
    if (confirm("هل أنت متأكد من حذف هذه المشكلة؟")) {
      deleteProblem.mutate({ problemId: id }, {
        onSuccess: () => {
          toast({ title: "تم الحذف" });
          setLocation(problem?.roomId ? `/room/${problem.roomId}` : "/");
        },
      });
    }
  };

  const handleDeleteSolution = (solutionId: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الحل؟")) {
      deleteSolution.mutate({ solutionId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSolutionsQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetProblemQueryKey(id) });
        },
      });
    }
  };

  const backHref = problem?.roomId ? `/room/${problem.roomId}` : "/";

  if (isLoadingProblem) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4 pt-6">
        <Skeleton className="h-8 w-1/2 rounded-xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!problem) return <div className="p-8 text-center text-destructive font-bold">المشكلة غير موجودة</div>;

  const isProblemAuthor = problem.authorName === currentAuthorName;
  const score = problem.likesCount - problem.dislikesCount;

  return (
    <div className="min-h-[100dvh] bg-background pb-36">
      <AuthorNameDialog open={showAuthorDialog} onOpenChange={setShowAuthorDialog} onNameSet={() => {}} />

      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => setLocation(backHref)}
            className="p-2 hover:bg-muted rounded-xl transition-colors shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-base truncate flex-1 leading-snug">{problem.title}</h1>
          {isProblemAuthor && (
            <button
              onClick={handleDeleteProblem}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Problem card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-l from-primary to-teal-400" />
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">
                {problem.authorName}
              </span>
              <span className="text-xs text-muted-foreground" dir="ltr">
                {formatDistanceToNow(new Date(problem.createdAt), { addSuffix: true, locale: ar })}
              </span>
            </div>
            <h2 className="text-xl font-black text-foreground mb-3 leading-snug">{problem.title}</h2>
            <p className="text-[15px] text-foreground/85 whitespace-pre-wrap leading-relaxed">
              {problem.description}
            </p>
            <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/60">
              <button
                onClick={() => handleVoteProblem("like")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-sm transition-colors"
              >
                <ThumbsUp className="w-4 h-4" /> {problem.likesCount}
              </button>
              <button
                onClick={() => handleVoteProblem("dislike")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm transition-colors"
              >
                <ThumbsDown className="w-4 h-4" /> {problem.dislikesCount}
              </button>
              <span className={`mr-auto text-sm font-black px-3 py-1.5 rounded-xl ${score > 0 ? "bg-emerald-100 text-emerald-700" : score < 0 ? "bg-rose-100 text-rose-600" : "bg-muted text-muted-foreground"}`}>
                {score > 0 ? "+" : ""}{score} نقطة
              </span>
            </div>
          </div>
        </div>

        {/* Solutions header */}
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-base">
            الحلول المقترحة
          </h3>
          <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-1">
            {problem.solutionsCount}
          </span>
        </div>

        {/* Solutions */}
        {isLoadingSolutions ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
          </div>
        ) : solutions?.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-2xl border border-dashed text-muted-foreground">
            <p className="font-medium mb-1">لا توجد حلول مقترحة بعد</p>
            <p className="text-sm">اكتب حلاً في الأسفل وشارك برأيك</p>
          </div>
        ) : (
          <div className="space-y-3">
            {solutions?.map((solution, index) => {
              const solScore = solution.likesCount - solution.dislikesCount;
              const isTopSolution = index === 0 && solution.likesCount > 0;
              return (
                <div
                  key={solution.id}
                  className={`bg-card rounded-2xl border shadow-sm overflow-hidden ${isTopSolution ? "border-emerald-200" : "border-border"}`}
                >
                  {isTopSolution && <div className="h-0.5 bg-gradient-to-l from-emerald-400 to-teal-400" />}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          {solution.authorName}
                        </span>
                        {isTopSolution && (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                            الحل الأعلى تصويتاً
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground" dir="ltr">
                          {formatDistanceToNow(new Date(solution.createdAt), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                      {solution.authorName === currentAuthorName && (
                        <button
                          onClick={() => handleDeleteSolution(solution.id)}
                          className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[14px] text-foreground whitespace-pre-wrap leading-relaxed mb-3">
                      {solution.content}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVoteSolution(solution.id, "like")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-colors"
                      >
                        <ThumbsUp className="w-3 h-3" /> {solution.likesCount}
                      </button>
                      <button
                        onClick={() => handleVoteSolution(solution.id, "dislike")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 text-xs font-bold transition-colors"
                      >
                        <ThumbsDown className="w-3 h-3" /> {solution.dislikesCount}
                      </button>
                      {solScore !== 0 && (
                        <span className={`mr-auto text-xs font-black ${solScore > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {solScore > 0 ? "+" : ""}{solScore}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Fixed bottom input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/60 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto flex gap-2 items-end">
          <Textarea
            placeholder="اقترح حلاً للمشكلة..."
            value={newSolution}
            onChange={(e) => setNewSolution(e.target.value)}
            className="min-h-[48px] max-h-[120px] resize-none flex-1 text-sm rounded-2xl border-border/80 focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddSolution(); }
            }}
          />
          <Button
            size="icon"
            className="shrink-0 h-12 w-12 rounded-2xl shadow-md"
            onClick={handleAddSolution}
            disabled={!newSolution.trim() || createSolution.isPending}
          >
            <Send className="w-5 h-5 rtl:-scale-x-100" />
          </Button>
        </div>
      </div>
    </div>
  );
}
