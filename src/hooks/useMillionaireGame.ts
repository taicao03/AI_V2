import { useCallback, useEffect, useState } from 'react';
import { millionaireService } from '../services/millionaireService';
import type { MillionaireAnswerResult, MillionaireRecentWinner, MillionaireSessionState } from '../types/millionaire';

type UseMillionaireGameProps = {
  sessionToken: string | null;
};

export function useMillionaireGame({ sessionToken }: UseMillionaireGameProps) {
  const [session, setSession] = useState<MillionaireSessionState | null>(null);
  const [recentWinners, setRecentWinners] = useState<MillionaireRecentWinner[]>([]);
  const [lastAnswer, setLastAnswer] = useState<MillionaireAnswerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!sessionToken) {
      setSession(null);
      setRecentWinners([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [sessionResult, winnersResult] = await Promise.all([
      millionaireService.getCurrentSession(sessionToken),
      millionaireService.getRecentWinners(12),
    ]);

    setSession(sessionResult.data);
    setRecentWinners(winnersResult.data);
    setError(sessionResult.error?.message ?? winnersResult.error?.message ?? null);
    setLoading(false);
  }, [sessionToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startSession = useCallback(
    async (topic: string) => {
      if (!sessionToken) {
        setError('Ban can dang nhap de bat dau.');
        return false;
      }

      setActionLoading(true);
      const result = await millionaireService.startSession(sessionToken, topic);
      setActionLoading(false);

      if (result.error) {
        setError(result.error.message);
        return false;
      }

      setSession(result.data);
      setLastAnswer(null);
      setError(null);
      return true;
    },
    [sessionToken],
  );

  const answerQuestion = useCallback(
    async (choiceIndex: number) => {
      if (!sessionToken) {
        setError('Ban can dang nhap de tra loi.');
        return false;
      }

      setActionLoading(true);
      const result = await millionaireService.answerCurrentQuestion(sessionToken, choiceIndex);
      setActionLoading(false);

      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Khong the xu ly cau tra loi.');
        return false;
      }

      setLastAnswer(result.data);
      await reload();
      return true;
    },
    [reload, sessionToken],
  );

  const useLifeline5050 = useCallback(async () => {
    if (!sessionToken) {
      setError('Ban can dang nhap de dung tro giup.');
      return false;
    }

    setActionLoading(true);
    const result = await millionaireService.useLifeline5050(sessionToken);
    setActionLoading(false);

    if (result.error) {
      setError(result.error.message);
      return false;
    }

    setSession(result.data);
    setError(null);
    return true;
  }, [sessionToken]);

  const useLifelineSkip = useCallback(async () => {
    if (!sessionToken) {
      setError('Ban can dang nhap de dung tro giup.');
      return false;
    }

    setActionLoading(true);
    const result = await millionaireService.useLifelineSkip(sessionToken);
    setActionLoading(false);

    if (result.error) {
      setError(result.error.message);
      return false;
    }

    setSession(result.data);
    setError(null);
    return true;
  }, [sessionToken]);

  return {
    session,
    recentWinners,
    lastAnswer,
    loading,
    actionLoading,
    error,
    reload,
    startSession,
    answerQuestion,
    useLifeline5050,
    useLifelineSkip,
  };
}

