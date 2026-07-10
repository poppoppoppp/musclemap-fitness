import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchMusicAccount,
  fetchMusicQrStatus,
  logoutMusicAccount,
  startMusicQrLogin,
  type MusicAccount,
  type MusicQrStatus
} from '../utils/musicAuth';

const QR_POLL_INTERVAL_MS = 1_200;

function vipLabel(vipType: MusicAccount['vipType']) {
  return Number(vipType ?? 0) > 0 ? '黑胶 VIP' : '普通用户';
}

function qrStatusLabel(status: MusicQrStatus['status'] | null) {
  if (status === 'scanned') return '已扫码，请在网易云 App 中确认';
  if (status === 'expired') return '二维码已过期，请重新生成';
  if (status === 'error') return '绑定失败，请重新尝试';
  return '请使用网易云音乐 App 扫码';
}

export default function MusicSettings() {
  const [account, setAccount] = useState<MusicAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [loginId, setLoginId] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState('');
  const [qrStatus, setQrStatus] = useState<MusicQrStatus['status'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchMusicAccount()
      .then((state) => {
        if (!active) return;
        setAccount(state.bound && state.account ? state.account : null);
        if (state.reason === 'LOGIN_EXPIRED') setError('网易云登录状态已过期，请重新绑定');
      })
      .catch((requestError: Error & { code?: string }) => {
        if (!active) return;
        setError(requestError.code === 'MUSIC_AUTH_NOT_CONFIGURED'
          ? '服务端登录存储尚未配置'
          : '暂时无法读取网易云账号状态');
      })
      .finally(() => {
        if (active) setAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loginId) return;
    let active = true;
    let timerId: number | undefined;

    const checkStatus = async () => {
      try {
        const result = await fetchMusicQrStatus(loginId);
        if (!active) return;
        setQrStatus(result.status);
        if (result.status === 'authorized' && result.account) {
          setAccount(result.account);
          setLoginId(null);
          setQrImage('');
          setError('');
          return;
        }
        if (result.status === 'expired' || result.status === 'error') return;
        timerId = window.setTimeout(checkStatus, QR_POLL_INTERVAL_MS);
      } catch (requestError) {
        if (!active) return;
        setQrStatus('error');
        setError(requestError instanceof Error ? requestError.message : '二维码状态查询失败');
      }
    };

    timerId = window.setTimeout(checkStatus, 250);
    return () => {
      active = false;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [loginId]);

  const startBinding = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await startMusicQrLogin();
      setLoginId(result.loginId);
      setQrImage(result.qrImage);
      setQrStatus('waiting');
    } catch (requestError) {
      setError(requestError instanceof Error && (requestError as Error & { code?: string }).code === 'MUSIC_AUTH_NOT_CONFIGURED'
        ? '服务端登录存储尚未配置'
        : '二维码生成失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setError('');
    try {
      await logoutMusicAccount();
      setAccount(null);
      setLoginId(null);
      setQrImage('');
      setQrStatus(null);
    } catch {
      setError('解除绑定失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative -mx-4 -mt-5 min-h-[calc(100vh-5rem)] overflow-hidden bg-[#080a08] px-4 pb-8 pt-6 text-white sm:-mx-6 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_75%_0%,rgba(190,242,48,0.12),transparent_42%)]" />
      <div className="relative mx-auto max-w-[440px] space-y-6">
        <header className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link to="/" aria-label="返回首页" className="flex h-11 w-11 items-center justify-center rounded-full border border-lime-300/25 bg-white/[0.05] text-2xl text-lime-300">‹</Link>
          <h1 className="text-center text-2xl font-black tracking-tight">训练音乐设置</h1>
          <span />
        </header>

        <section className="rounded-[28px] border border-lime-300/25 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-5 shadow-[0_0_28px_rgba(132,204,22,0.10)]">
          <span className="inline-flex rounded-full border border-lime-300/35 bg-lime-300/10 px-3 py-1 text-xs font-black text-lime-300">方式一</span>
          <h2 className="mt-4 text-xl font-black">我的网易云</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">扫码绑定后，可读取账号创建和收藏的歌单，并在后续播放时使用该账号权限。</p>

          {accountLoading ? (
            <p className="mt-5 text-sm font-semibold text-zinc-400">正在检查账号状态…</p>
          ) : account ? (
            <div className="mt-5 flex items-center gap-4 rounded-2xl border border-lime-300/25 bg-black/25 p-4">
              {account.avatarUrl ? <img src={account.avatarUrl} alt="网易云账号头像" className="h-14 w-14 rounded-2xl object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300/10 text-xl text-lime-300">♪</span>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black">{account.nickname}</p>
                <p className="mt-1 text-sm font-bold text-lime-300">{vipLabel(account.vipType)}</p>
              </div>
              <button type="button" disabled={busy} onClick={logout} className="min-h-11 rounded-full border border-red-300/30 px-4 text-sm font-bold text-red-200 disabled:opacity-50">解除绑定</button>
            </div>
          ) : qrImage ? (
            <div className="mt-5 text-center">
              <div className="mx-auto w-fit rounded-[24px] bg-white p-3">
                <img src={qrImage} alt="网易云登录二维码" className="h-52 w-52" />
              </div>
              <p className={`mt-4 text-sm font-bold ${qrStatus === 'scanned' ? 'text-lime-300' : 'text-zinc-300'}`}>{qrStatusLabel(qrStatus)}</p>
              {qrStatus === 'expired' || qrStatus === 'error' ? (
                <button type="button" onClick={startBinding} disabled={busy} className="mt-4 min-h-11 rounded-full bg-lime-300 px-5 text-sm font-black text-[#10130d] disabled:opacity-50">重新生成二维码</button>
              ) : null}
            </div>
          ) : (
            <button type="button" onClick={startBinding} disabled={busy} className="mt-5 min-h-12 w-full rounded-full bg-lime-300 px-5 text-sm font-black text-[#10130d] shadow-[0_0_22px_rgba(190,242,100,0.25)] disabled:opacity-50">
              {busy ? '正在生成二维码' : '绑定网易云账号'}
            </button>
          )}

          {error ? <p role="alert" className="mt-4 rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200">{error}</p> : null}
        </section>

        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
          <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-black text-zinc-400">方式二</span>
          <h2 className="mt-4 text-lg font-black">导入其他歌单</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">现有链接或歌单 ID 导入功能继续保留，可从首页音乐卡片使用。</p>
          <Link to="/" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-lime-300/35 px-4 text-sm font-bold text-lime-300">返回首页导入</Link>
        </section>
      </div>
    </div>
  );
}
