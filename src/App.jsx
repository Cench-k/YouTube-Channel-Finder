import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings, Trash2, FolderEdit, Youtube, Calendar, ListVideo, Users,
  Loader2, Edit3, Check, Database, RefreshCw, Zap, LogIn, LogOut, User,
  CheckCircle, Video, BarChart3, TrendingUp, ChevronDown, ChevronUp,
  Tag, Radio, Globe, Download, ThumbsUp, MessageSquare, Flame, X,
  Activity, PlaySquare, BarChart2
} from 'lucide-react';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut
} from 'firebase/auth';
import {
  getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc
} from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : "yt-finder-v1";

const getSafeEnv = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) return import.meta.env[key];
    if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
    return '';
  } catch { return ''; }
};

const ENV_FB_CONFIG = {
  apiKey: getSafeEnv('VITE_FB_API_KEY'), authDomain: getSafeEnv('VITE_FB_AUTH_DOMAIN'),
  projectId: getSafeEnv('VITE_FB_PROJECT_ID'), storageBucket: getSafeEnv('VITE_FB_STORAGE_BUCKET'),
  messagingSenderId: getSafeEnv('VITE_FB_MESSAGING_SENDER_ID'), appId: getSafeEnv('VITE_FB_APP_ID')
};
const ENV_YOUTUBE_KEY = getSafeEnv('VITE_YOUTUBE_API_KEY');

const VIDEO_CATEGORIES = {
  "1":"영화/애니메이션","2":"자동차","10":"음악","15":"애완동물/동물","17":"스포츠",
  "18":"단편영화","19":"여행/이벤트","20":"게임","21":"일상/브이로그","22":"인물/블로그",
  "23":"코미디","24":"엔터테인먼트","25":"뉴스/정치","26":"노하우/스타일","27":"교육",
  "28":"과학기술","29":"비영리/사회운동"
};

const COUNTRY_FLAG = { KR:'🇰🇷', US:'🇺🇸', JP:'🇯🇵', GB:'🇬🇧', DE:'🇩🇪', FR:'🇫🇷', IN:'🇮🇳', BR:'🇧🇷', CA:'🇨🇦', AU:'🇦🇺' };

const formatNumber = (n) => {
  const num = parseInt(n || 0);
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "억";
  if (num >= 10000) return (num / 10000).toFixed(1) + "만";
  if (num >= 1000) return (num / 1000).toFixed(1) + "천";
  return num.toString();
};

const parseISO8601Duration = (d) => {
  if (!d) return "00:00";
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "00:00";
  const h = parseInt(m[1]) || 0, min = parseInt(m[2]) || 0, s = parseInt(m[3]) || 0;
  return h > 0 ? `${h}:${min.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${min}:${s.toString().padStart(2,'0')}`;
};

const formatRate = (n) => (n != null && !isNaN(n)) ? n.toFixed(2) + '%' : '-';

const getDurationSeconds = (d) => {
  if (!d) return 0;
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1])||0)*3600 + (parseInt(m[2])||0)*60 + (parseInt(m[3])||0);
};

const calcHealthScore = (r) => {
  const engScore  = Math.min((r.engagement  || 0) / 5  * 25, 25);
  const effScore  = Math.min((r.efficiency  || 0) / 3  * 25, 25);
  const likeScore = Math.min((r.likeRate    || 0) / 3  * 25, 25);
  const freqScore = Math.min((r.uploadRate  || 0) * 7  * 25, 25);
  return Math.round(engScore + effScore + likeScore + freqScore);
};

const CPM_TABLE = { KR:[1.5,4], US:[3,8], JP:[2,5], GB:[3,7], DE:[2.5,6] };
const calcRevenue = (monthlyViews, country) => {
  const [lo, hi] = CPM_TABLE[country] || [1, 3];
  return { lo: Math.round(monthlyViews/1000*lo), hi: Math.round(monthlyViews/1000*hi) };
};
const formatKRW = (usd) => {
  const krw = Math.round(usd * 1380);
  if (krw >= 100000000) return (krw/100000000).toFixed(1) + '억원';
  if (krw >= 10000) return Math.round(krw/10000) + '만원';
  return krw.toLocaleString() + '원';
};

const getHealthColor = (score) => {
  if (score >= 75) return 'text-green-400 border-green-500/40 bg-green-500/10';
  if (score >= 50) return 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10';
  if (score >= 25) return 'text-orange-400 border-orange-500/40 bg-orange-500/10';
  return 'text-red-400 border-red-500/40 bg-red-500/10';
};

// ─── SetupGuideModal ───────────────────────────────────────────────────────────
const SetupGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 text-white">
      <div className="bg-[#1a1a1a] w-full max-w-2xl border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313]">
          <h2 className="text-xl flex items-center gap-2 font-bold"><Zap className="text-yellow-400" size={24}/> 상세 설정 가이드</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2"><X size={24}/></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-8 text-sm text-left font-sans">
          <section><h3 className="text-lg mb-2 font-bold text-blue-400">1. Firebase 연동</h3><p className="text-gray-400">콘솔에서 생성한 웹 앱의 firebaseConfig 객체를 입력창에 붙여넣으세요.</p></section>
          <section><h3 className="text-lg mb-2 font-bold text-red-400">2. 도메인 승인</h3><p className="text-gray-400">Firebase 콘솔 &gt; Auth &gt; 설정에서 현재 도메인을 승인된 도메인에 추가하세요.</p></section>
          <section><h3 className="text-lg mb-2 font-bold text-green-400">3. YouTube Data API</h3><p className="text-gray-400">Google Cloud Console에서 YouTube Data API v3를 활성화하고 API 키를 발급받아 입력하세요.</p></section>
        </div>
        <div className="p-6 bg-black/40 border-t border-gray-800">
          <button onClick={onClose} className="w-full bg-blue-600 py-4 rounded-2xl font-bold transition active:scale-95 font-sans">확인했습니다</button>
        </div>
      </div>
    </div>
  );
};

// ─── CategoryModal ─────────────────────────────────────────────────────────────
const CategoryModal = ({ isOpen, onClose, categories, onAdd, onDelete }) => {
  const [newCat, setNewCat] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] w-full max-w-md border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#131313] text-white">
          <h2 className="text-xl flex items-center gap-2 font-bold font-sans"><FolderEdit size={20} className="text-red-500"/> 카테고리 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24}/></button>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <input type="text" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="새 카테고리 명" className="flex-1 bg-[#2c2c2c] border border-gray-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-red-600 font-sans" onKeyDown={e => e.key === 'Enter' && newCat.trim() && (onAdd(newCat), setNewCat(''))}/>
            <button onClick={() => { if(newCat.trim()) { onAdd(newCat); setNewCat(''); }}} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold font-sans">추가</button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2 text-white no-scrollbar">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-4 bg-[#2c2c2c] rounded-xl group">
                <span className="font-bold font-sans">{cat.name}</span>
                <button onClick={() => onDelete(cat.id)} className="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-center text-gray-500 py-4 italic font-sans">등록된 카테고리가 없습니다.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CompareModal ──────────────────────────────────────────────────────────────
const CompareModal = ({ isOpen, onClose, savedChannels }) => {
  const [selected, setSelected] = useState([]);
  if (!isOpen) return null;

  const toggle = (ch) => {
    if (selected.find(s => s.id === ch.id)) {
      setSelected(selected.filter(s => s.id !== ch.id));
    } else if (selected.length < 3) {
      setSelected([...selected, ch]);
    }
  };

  const metrics = [
    { label: '구독자', key: 'subs', fmt: formatNumber },
    { label: '조회수', key: 'views', fmt: formatNumber },
    { label: '효율 (조회수/구독자)', key: 'efficiency', fmt: v => v ? v.toFixed(1) + '배' : '-' },
    { label: '좋아요수', key: 'likes', fmt: formatNumber },
    { label: '참여율', key: 'engagement', fmt: v => v ? v.toFixed(2) + '%' : '-' },
    { label: '좋아요율', key: 'likeRate', fmt: v => v ? v.toFixed(2) + '%' : '-' },
    { label: '타입', key: 'type', fmt: v => v === 'video' ? '영상' : '채널' },
    { label: '카테고리', key: 'category', fmt: v => v || '-' },
  ];

  return (
    <div className="fixed inset-0 z-[1800] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-sans">
      <div className="bg-[#1a1a1a] w-full max-w-4xl border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313]">
          <h2 className="text-xl font-bold flex items-center gap-2"><BarChart2 size={22} className="text-blue-400"/> 채널 비교 분석 <span className="text-xs text-gray-500 font-normal">최대 3개 선택</span></h2>
          <button onClick={() => { onClose(); setSelected([]); }} className="text-gray-400 hover:text-white p-2"><X size={24}/></button>
        </div>
        <div className="flex gap-6 p-6 overflow-hidden flex-1 min-h-0">
          {/* 채널 선택 목록 */}
          <div className="w-56 shrink-0 overflow-y-auto no-scrollbar space-y-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">저장된 채널 선택</p>
            {savedChannels.map(ch => {
              const isOn = !!selected.find(s => s.id === ch.id);
              const disabled = !isOn && selected.length >= 3;
              return (
                <button key={ch.id} onClick={() => toggle(ch)} disabled={disabled} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${isOn ? 'border-blue-500 bg-blue-500/10' : disabled ? 'border-gray-800 opacity-40 cursor-not-allowed' : 'border-gray-800 hover:border-gray-600'}`}>
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-800 shrink-0">
                    <img src={ch.thumbnail || ch.thumb} alt="" className="w-full h-full object-cover"/>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{ch.name || ch.title}</p>
                    <p className="text-[10px] text-gray-500">{formatNumber(ch.subs)} 구독</p>
                  </div>
                  {isOn && <div className="w-4 h-4 rounded-full bg-blue-500 shrink-0 ml-auto flex items-center justify-center"><Check size={10}/></div>}
                </button>
              );
            })}
            {savedChannels.length === 0 && <p className="text-xs text-gray-600 italic">저장된 채널이 없습니다.</p>}
          </div>
          {/* 비교 테이블 */}
          <div className="flex-1 overflow-x-auto">
            {selected.length < 2 ? (
              <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">채널을 2개 이상 선택하세요.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] text-gray-500 uppercase pb-4 w-36">항목</th>
                    {selected.map(ch => (
                      <th key={ch.id} className="pb-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800"><img src={ch.thumbnail || ch.thumb} alt="" className="w-full h-full object-cover"/></div>
                          <span className="text-xs font-bold truncate max-w-[100px]">{ch.name || ch.title}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {metrics.map(m => {
                    const vals = selected.map(ch => ch[m.key]);
                    const numVals = vals.map(v => parseFloat(v) || 0);
                    const maxVal = Math.max(...numVals);
                    return (
                      <tr key={m.key}>
                        <td className="py-3 text-[11px] text-gray-500 uppercase">{m.label}</td>
                        {selected.map((ch, i) => {
                          const isMax = numVals[i] === maxVal && maxVal > 0;
                          return (
                            <td key={ch.id} className={`py-3 text-center text-sm font-bold ${isMax ? 'text-green-400' : 'text-gray-300'}`}>
                              {m.fmt(ch[m.key])}
                              {isMax && numVals.filter(v => v === maxVal).length === 1 && <span className="ml-1 text-[9px] bg-green-500/20 text-green-400 px-1 rounded">최고</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── AnalysisModal ─────────────────────────────────────────────────────────────
const AnalysisModal = ({ isOpen, onClose, channel, apiKey }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isOpen || !channel || !apiKey) return;
    const fetch_ = async () => {
      setLoading(true); setStats(null);
      try {
        const cid = channel.channelId;
        // 플레이리스트 API 사용 (search API 대비 quota 절약)
        const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,brandingSettings,contentDetails&id=${cid}&key=${apiKey}`);
        const chData = await chRes.json();
        const chFull = chData.items?.[0] || {};
        const branding = chFull.brandingSettings || {};
        const uploadsPlaylistId = chFull.contentDetails?.relatedPlaylists?.uploads;

        let detVids = [];
        if (uploadsPlaylistId) {
          const plRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50&key=${apiKey}`);
          const plData = await plRes.json();
          const videoIds = (plData.items || []).map(i => i.contentDetails.videoId).join(',');
          if (videoIds) {
            const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`);
            const vData = await vRes.json();
            detVids = vData.items || [];
          }
        }

        // 30일 필터
        const ago30 = Date.now() - 30 * 86400000;
        const recent30 = detVids.filter(v => new Date(v.snippet.publishedAt).getTime() >= ago30);

        // 날짜 맵 (순서 보장 배열)
        const dateEntries = Array.from({ length: 31 }, (_, i) => {
          const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
          return [d, 0];
        });
        const dMap = Object.fromEntries(dateEntries);
        let uDays = 0;
        recent30.forEach(v => {
          const d = v.snippet.publishedAt.slice(0, 10);
          if (dMap[d] !== undefined) { if (dMap[d] === 0) uDays++; dMap[d]++; }
        });

        // 태그 집계
        const tagMap = {};
        recent30.forEach(v => (v.snippet.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
        const topTags = Object.entries(tagMap).sort((a,b) => b[1]-a[1]).slice(0, 12).map(([t]) => t);

        // 통계
        const totalViews = recent30.reduce((a,v) => a + parseInt(v.statistics.viewCount||0), 0);
        const totalLikes = recent30.reduce((a,v) => a + parseInt(v.statistics.likeCount||0), 0);
        const totalComments = recent30.reduce((a,v) => a + parseInt(v.statistics.commentCount||0), 0);
        const count = recent30.length || 1;
        const hdCount = recent30.filter(v => v.contentDetails?.definition === 'hd').length;
        const captionCount = recent30.filter(v => v.contentDetails?.caption === 'true').length;

        // 채널 성장 추정
        const channelAgeYears = Math.max((Date.now() - new Date(chFull.snippet?.publishedAt).getTime()) / (365*86400000), 0.01);
        const totalSubs = parseInt(chFull.statistics?.subscriberCount || 0);

        // 성장 모멘텀
        const avgRecentV = Math.round(totalViews / count);
        const avgAllTimeV = Math.round(parseInt(chFull.statistics?.viewCount||0) / Math.max(channelAgeYears * 365, 1));
        const momentum = avgAllTimeV > 0 ? avgRecentV / avgAllTimeV : 1;

        // 영상 일관성
        const viewsList = recent30.map(v => parseInt(v.statistics.viewCount||0));
        const vMean = viewsList.reduce((a,b)=>a+b,0) / Math.max(viewsList.length, 1);
        const vStd = Math.sqrt(viewsList.reduce((a,b)=>a+(b-vMean)**2,0) / Math.max(viewsList.length, 1));
        const consistency = vMean > 0 ? Math.max(0, Math.round(100 - vStd/vMean*100)) : 0;

        // 업로드 요일 분석
        const dayNames = ['일','월','화','수','목','금','토'];
        const dayCount = [0,0,0,0,0,0,0];
        recent30.forEach(v => { dayCount[new Date(v.snippet.publishedAt).getDay()]++; });
        const uploadDayPattern = dayNames.map((name, i) => ({name, count: dayCount[i]}));

        // 조회수 분포 (최근 10개)
        const viewsChart = recent30.slice(0, 10).map(v => ({
          title: v.snippet.title.substring(0, 20),
          views: parseInt(v.statistics.viewCount||0)
        }));

        setStats({
          banner: branding.image?.bannerExternalUrl,
          keywords: branding.channel?.keywords ? branding.channel.keywords.replace(/"/g,'').split(' ').filter(Boolean) : [],
          country: chFull.snippet?.country || '',
          dateEntries: dateEntries.map(([date]) => [date, dMap[date]]),
          totalUploads: recent30.length,
          allTimeUploads: detVids.length,
          uploadDays: uDays,
          avgRecentViews: Math.round(totalViews / count),
          avgAllTimeViews: Math.round(parseInt(chFull.statistics?.viewCount||0) / Math.max(channelAgeYears * 365, 1)),
          avgLikes: Math.round(totalLikes / count),
          avgComments: Math.round(totalComments / count),
          avgEngagement: (totalLikes + totalComments) / Math.max(totalViews, 1) * 100,
          avgLikeRate: totalLikes / Math.max(totalViews, 1) * 100,
          subCount: totalSubs,
          dailySubGrowth: Math.round(totalSubs / (channelAgeYears * 365)),
          maxViews: recent30.length ? Math.max(...recent30.map(v => parseInt(v.statistics.viewCount||0))) : 0,
          hdCount, captionCount, topTags,
          recentVideos: recent30.slice(0, 10),
          isLive: chFull.snippet?.liveBroadcastContent === 'live',
          momentum, consistency,
          uploadDayPattern, viewsChart,
          monthlyViews: totalViews,
          revenueCountry: chFull.snippet?.country || 'KR',
        });
      } catch(e) { console.error(e); } finally { setLoading(false); }
    };
    fetch_();
  }, [isOpen, channel, apiKey]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto font-sans">
      <div className="bg-[#1a1a1a] w-full max-w-3xl border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] text-white">
        {!loading && stats?.banner && (
          <div className="w-full h-32 md:h-40 overflow-hidden relative shrink-0">
            <img src={stats.banner} className="w-full h-full object-cover opacity-60" alt=""/>
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent"/>
          </div>
        )}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313] shrink-0 relative z-10">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-16 h-16 rounded-full overflow-hidden border-2 border-red-600/50 bg-gray-800 shrink-0 ${stats?.banner ? '-mt-12 shadow-xl' : ''}`}>
              <img src={channel?.thumbnail || channel?.thumb} alt="" className="w-full h-full object-cover"/>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold truncate">{channel?.name || channel?.title || channel?.channelTitle}</h2>
                {stats?.country && <span className="text-lg">{COUNTRY_FLAG[stats.country] || ''}</span>}
                {stats?.isLive && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-1"><Radio size={10}/> LIVE</span>}
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Channel Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 bg-white/5 rounded-full"><X size={28}/></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-10 flex-1 no-scrollbar">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="animate-spin mb-4" size={48}/>
              <p className="uppercase tracking-widest text-xs">데이터 분석 중...</p>
            </div>
          ) : stats ? (
            <>
              {/* 키워드 */}
              {stats.keywords.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Tag size={14}/> 채널 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.keywords.slice(0,10).map((kw,i) => <span key={i} className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[11px] text-gray-400">#{kw}</span>)}
                  </div>
                </section>
              )}

              {/* 활동 요약 */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={16} className="text-red-500"/> 활동 요약</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { val: stats.totalUploads, label: "30일 업로드", color: "text-red-500" },
                    { val: stats.totalUploads > 0 ? `${(30/stats.totalUploads).toFixed(1)}일` : "-", label: "업로드 빈도", color: "text-orange-500" },
                    { val: stats.uploadDays, label: "활동 날짜", color: "text-yellow-500" },
                    { val: formatNumber(stats.maxViews), label: "최다 조회수", color: "text-pink-500" }
                  ].map((c,i) => (
                    <div key={i} className="bg-[#111] border border-gray-800 p-4 rounded-xl text-center">
                      <p className={`text-xl font-bold ${c.color}`}>{c.val}</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase">{c.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 조회수 분석 */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16} className="text-green-500"/> 조회수 분석</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-600/5 border border-orange-600/20 p-5 rounded-2xl text-center">
                    <p className="text-3xl font-bold text-orange-500">{formatNumber(stats.avgRecentViews)}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">최근 30일 영상 평균</p>
                  </div>
                  <div className="bg-blue-600/5 border border-blue-600/20 p-5 rounded-2xl text-center">
                    <p className="text-3xl font-bold text-blue-500">{formatNumber(stats.avgAllTimeViews)}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">역대 일평균 조회수</p>
                  </div>
                </div>
              </section>

              {/* 참여도 분석 (신규) */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><ThumbsUp size={16} className="text-pink-500"/> 참여도 분석</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { val: formatNumber(stats.avgLikes), label: "평균 좋아요", color: "text-pink-500", icon: <ThumbsUp size={12}/> },
                    { val: formatNumber(stats.avgComments), label: "평균 댓글", color: "text-purple-400", icon: <MessageSquare size={12}/> },
                    { val: formatRate(stats.avgLikeRate), label: "좋아요율", color: "text-rose-400", icon: null },
                    { val: formatRate(stats.avgEngagement), label: "참여율 (종합)", color: "text-violet-400", icon: null },
                  ].map((c,i) => (
                    <div key={i} className="bg-[#111] border border-gray-800 p-4 rounded-xl text-center">
                      <p className={`text-xl font-bold ${c.color} flex items-center justify-center gap-1`}>{c.icon}{c.val}</p>
                      <p className="text-[10px] text-gray-500 mt-1 uppercase">{c.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 채널 성장 추정 (신규) */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Activity size={16} className="text-cyan-500"/> 채널 성장 추정</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-cyan-600/5 border border-cyan-600/20 p-5 rounded-2xl text-center">
                    <p className="text-3xl font-bold text-cyan-400">+{formatNumber(stats.dailySubGrowth)}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">일평균 구독자 증가 (추정)</p>
                  </div>
                  <div className="bg-teal-600/5 border border-teal-600/20 p-5 rounded-2xl text-center">
                    <p className="text-3xl font-bold text-teal-400">{stats.hdCount}/{stats.totalUploads}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">HD 영상 / 자막 {stats.captionCount}개</p>
                  </div>
                </div>
              </section>

              {/* 영상 태그 (신규) */}
              {stats.topTags.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Tag size={14} className="text-yellow-500"/> 자주 사용하는 태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.topTags.map((tag,i) => <span key={i} className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2.5 py-1 rounded-lg text-[11px]">#{tag}</span>)}
                  </div>
                </section>
              )}

              {/* 성장 모멘텀 + 일관성 */}
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400"/> 성장 모멘텀 &amp; 일관성</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl text-center border ${stats.momentum >= 1.2 ? 'bg-green-600/5 border-green-600/20' : stats.momentum >= 0.8 ? 'bg-yellow-600/5 border-yellow-600/20' : 'bg-red-600/5 border-red-600/20'}`}>
                    <p className={`text-3xl font-bold ${stats.momentum >= 1.2 ? 'text-green-400' : stats.momentum >= 0.8 ? 'text-yellow-400' : 'text-red-400'}`}>{stats.momentum?.toFixed(2)}x</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">성장 모멘텀</p>
                    <p className="text-[9px] mt-1 text-gray-600">{stats.momentum >= 1.2 ? '🚀 빠르게 성장 중' : stats.momentum >= 0.8 ? '→ 안정적 유지' : '⬇ 하락 추세'}</p>
                  </div>
                  <div className={`p-5 rounded-2xl text-center border ${stats.consistency >= 70 ? 'bg-blue-600/5 border-blue-600/20' : stats.consistency >= 40 ? 'bg-yellow-600/5 border-yellow-600/20' : 'bg-orange-600/5 border-orange-600/20'}`}>
                    <p className={`text-3xl font-bold ${stats.consistency >= 70 ? 'text-blue-400' : stats.consistency >= 40 ? 'text-yellow-400' : 'text-orange-400'}`}>{stats.consistency}점</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">영상 일관성</p>
                    <p className="text-[9px] mt-1 text-gray-600">{stats.consistency >= 70 ? '✅ 안정형' : stats.consistency >= 40 ? '〰 보통' : '⚡ 들쑥날쑥형'}</p>
                  </div>
                </div>
              </section>

              {/* 예상 월수익 */}
              {stats.monthlyViews > 0 && (() => {
                const rev = calcRevenue(stats.monthlyViews, stats.revenueCountry);
                return (
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={16} className="text-emerald-400"/> 예상 월수익 (30일 기준)</h3>
                    <div className="bg-emerald-600/5 border border-emerald-600/20 p-5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold text-emerald-400">{formatKRW(rev.lo)} ~ {formatKRW(rev.hi)}</p>
                          <p className="text-[10px] text-gray-500 mt-1">USD ${rev.lo} ~ ${rev.hi} · CPM {CPM_TABLE[stats.revenueCountry]?.[0] || 1}~{CPM_TABLE[stats.revenueCountry]?.[1] || 3}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatNumber(stats.monthlyViews)} 조회수 기준</p>
                          <p className="text-[9px] text-gray-600 mt-0.5">광고 수익만 추정 (간접수익 미포함)</p>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })()}

              {/* 조회수 분포 차트 */}
              {stats.viewsChart?.length > 0 && (
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><BarChart2 size={16} className="text-red-400"/> 최근 영상 조회수 분포</h3>
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <MiniBarChart data={stats.viewsChart}/>
                  </div>
                </section>
              )}

              {/* 업로드 요일 패턴 */}
              {stats.uploadDayPattern && (
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={16} className="text-purple-400"/> 업로드 요일 패턴 (30일)</h3>
                  <DayPatternChart data={stats.uploadDayPattern}/>
                  <p className="text-[10px] text-gray-600 text-center">
                    주로 {stats.uploadDayPattern.filter(d=>d.count>0).sort((a,b)=>b.count-a.count).slice(0,2).map(d=>d.name+'요일').join(', ')}에 업로드
                  </p>
                </section>
              )}

              {/* 업로드 달력 */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={16}/> 업로드 달력 (30일)</h3>
                <div className="grid grid-cols-7 gap-2 bg-black/30 p-4 rounded-2xl border border-white/5 text-center">
                  {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => <div key={d} className="text-[9px] text-gray-600 font-bold mb-1">{d}</div>)}
                  {[...stats.dateEntries].reverse().map(([date, count]) => (
                    <div key={date} className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition ${count > 0 ? 'bg-red-600/20 border-red-600/40 text-red-500 shadow-lg' : 'bg-white/5 border-transparent text-gray-700'}`}>
                      <span className="text-[9px] opacity-40">{date.split('-')[2]}</span>
                      {count > 0 && <span className="text-xs font-bold">{count}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* 최근 영상 */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><ListVideo size={16}/> 최근 업로드 영상 (10개)</h3>
                <div className="grid grid-cols-1 gap-3">
                  {stats.recentVideos.length > 0 ? stats.recentVideos.map(vid => {
                    const vV = parseInt(vid.statistics?.viewCount||0);
                    const vL = parseInt(vid.statistics?.likeCount||0);
                    const vC = parseInt(vid.statistics?.commentCount||0);
                    const sC = stats.subCount || 1;
                    return (
                      <a key={vid.id} href={`https://www.youtube.com/watch?v=${vid.id}`} target="_blank" rel="noreferrer" className="flex gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 group transition">
                        <div className="w-28 aspect-video rounded overflow-hidden shrink-0 bg-gray-900 relative">
                          <img src={vid.snippet.thumbnails.medium?.url} className="w-full h-full object-cover" alt=""/>
                          <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1.5 py-0.5 rounded font-bold text-white">{parseISO8601Duration(vid.contentDetails?.duration)}</div>
                          {vid.contentDetails?.definition === 'hd' && <div className="absolute top-1 left-1 bg-blue-600 text-[8px] px-1 rounded text-white font-bold">HD</div>}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                          <p className="text-[13px] text-white font-bold line-clamp-2 leading-snug group-hover:text-red-400 transition">{vid.snippet.title}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-gray-500">
                            <span className="bg-red-600/10 text-red-500 px-1.5 rounded">{VIDEO_CATEGORIES[vid.snippet.categoryId]||"기타"}</span>
                            <span className="flex items-center gap-1"><TrendingUp size={10}/>{formatNumber(vV)}</span>
                            <span className="flex items-center gap-1"><ThumbsUp size={10}/>{formatNumber(vL)}</span>
                            <span className="flex items-center gap-1"><MessageSquare size={10}/>{formatNumber(vC)}</span>
                            <span className="text-yellow-500 font-bold ml-auto">효율 {(vV/sC).toFixed(1)}배</span>
                          </div>
                        </div>
                      </a>
                    );
                  }) : <p className="text-sm text-gray-600 italic">최근 업로드된 영상이 없습니다.</p>}
                </div>
              </div>
            </>
          ) : <p className="text-gray-600 text-center py-20">데이터를 불러오지 못했습니다.</p>}
        </div>
        <div className="p-5 bg-[#131313] border-t border-gray-800 shrink-0">
          <button onClick={onClose} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl transition active:scale-95">분석창 닫기</button>
        </div>
      </div>
    </div>
  );
};

// ─── ChannelCard ───────────────────────────────────────────────────────────────
const ChannelCard = ({ result, onRemove, onUpdateMemo, isSavedView, categories, onSave, onAnalyze, mode, onUpdateCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState(result.category || '');
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [tempMemo, setTempMemo] = useState(result.memo || '');

  useEffect(() => {
    if (!isSavedView && categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].name);
    if (isSavedView) setSelectedCategory(result.category);
  }, [categories, isSavedView, result.category]);

  const isVideo = mode === 'video' || result.type === 'video';
  const healthScore = calcHealthScore(result);
  const healthColor = getHealthColor(healthScore);

  return (
    <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all flex flex-col h-full text-white shadow-lg font-sans">
      <div className="flex gap-4 mb-4">
        <div onClick={() => onAnalyze(result)} className={`shrink-0 overflow-hidden bg-gray-800 cursor-pointer hover:ring-2 hover:ring-red-500 transition flex items-center justify-center ${isVideo ? 'w-24 h-14 rounded-lg' : 'w-16 h-16 rounded-full'}`}>
          <img src={result.thumbnail || result.thumb} alt="" className="w-full h-full object-cover"/>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-bold line-clamp-2 leading-snug mb-1.5 h-10">{result.title || result.name}</h3>
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-gray-800 text-gray-400 text-[9px] px-2 py-0.5 rounded-full uppercase">{isVideo ? 'Video' : 'Channel'}</span>
            {result.country && <span className="text-sm">{COUNTRY_FLAG[result.country] || ''}</span>}
            {result.efficiency > 0 && <span className="bg-orange-600/20 text-orange-400 text-[9px] px-2 py-0.5 rounded-full">🔥 효율 {result.efficiency.toFixed(1)}배</span>}
            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${healthColor}`}>♥ {healthScore}</span>
          </div>
        </div>
      </div>

      {/* 통계 그리드 */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-black/20 p-2 rounded-xl border border-white/5">
          <p className="text-[9px] text-gray-500 uppercase">Views</p>
          <p className="text-xs text-blue-400 font-bold">{formatNumber(result.views || 0)}</p>
        </div>
        <div className="bg-black/20 p-2 rounded-xl border border-white/5">
          <p className="text-[9px] text-gray-500 uppercase">Subs</p>
          <p className="text-xs text-green-400 font-bold">{formatNumber(result.subs || 0)}</p>
        </div>
      </div>
      {(result.likes > 0 || result.engagement > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-black/20 p-2 rounded-xl border border-white/5">
            <p className="text-[9px] text-gray-500 uppercase flex items-center gap-1"><ThumbsUp size={8}/> 좋아요</p>
            <p className="text-xs text-pink-400 font-bold">{formatNumber(result.likes || 0)}</p>
          </div>
          <div className="bg-black/20 p-2 rounded-xl border border-white/5">
            <p className="text-[9px] text-gray-500 uppercase">참여율</p>
            <p className="text-xs text-violet-400 font-bold">{formatRate(result.engagement)}</p>
          </div>
        </div>
      )}

      {isSavedView ? (
        <div className="mb-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <select value={selectedCategory} onChange={e => onUpdateCategory(result.id, e.target.value)} className="bg-yellow-600/10 text-yellow-500 text-[10px] px-2 py-0.5 rounded-lg border border-yellow-600/20 outline-none font-bold cursor-pointer">
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {!isEditingMemo
              ? <button onClick={() => setIsEditingMemo(true)} className="text-gray-500 hover:text-white"><Edit3 size={14}/></button>
              : <button onClick={() => { onUpdateMemo(result.id, tempMemo); setIsEditingMemo(false); }} className="text-green-500 hover:text-green-400"><Check size={16}/></button>}
          </div>
          {isEditingMemo
            ? <textarea autoFocus value={tempMemo} onChange={e => setTempMemo(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 focus:border-red-600 outline-none resize-none h-20"/>
            : <div className="bg-black/20 rounded-xl p-3 min-h-[40px] border border-white/5 text-[11px] text-gray-400 line-clamp-3">{result.memo || "작성된 메모가 없습니다."}</div>}
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">저장 위치</p>
          <select className="w-full bg-gray-800 text-gray-300 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none cursor-pointer" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            {categories.length > 0 ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option value="">카테고리 없음</option>}
          </select>
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        {!isSavedView
          ? <button onClick={() => onSave(result, selectedCategory, isVideo ? 'video' : 'channel')} className="flex-1 bg-white text-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 font-bold">저장하기</button>
          : <button onClick={() => onRemove(result.id)} className="flex-1 bg-red-600/20 text-red-500 text-xs py-2.5 rounded-xl border border-red-600/30 hover:bg-red-600 hover:text-white transition font-bold">삭제</button>}
        <button onClick={() => onAnalyze(result)} className="p-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition shrink-0 flex items-center justify-center" title="상세분석"><BarChart3 size={16}/></button>
      </div>
    </div>
  );
};

// ─── TrendingCard ──────────────────────────────────────────────────────────────
const TrendingCard = ({ result, rank, onSave, categories, onAnalyze }) => {
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name || '');
  useEffect(() => { if (categories.length > 0) setSelectedCategory(categories[0].name); }, [categories]);

  return (
    <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-all flex flex-col gap-3 text-white shadow-lg font-sans relative overflow-hidden">
      <div className="absolute top-3 left-3 w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-xs font-black z-10">{rank}</div>
      <div className="w-full aspect-video rounded-xl overflow-hidden bg-gray-900 relative cursor-pointer" onClick={() => onAnalyze(result)}>
        <img src={result.thumbnail} alt="" className="w-full h-full object-cover"/>
        <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-[10px] px-1.5 py-0.5 rounded font-bold text-white">{result.duration}</div>
        {result.definition === 'hd' && <div className="absolute top-1.5 left-1.5 bg-blue-600 text-[8px] px-1.5 py-0.5 rounded text-white font-bold">HD</div>}
      </div>
      <div>
        <p className="text-[13px] font-bold line-clamp-2 leading-snug mb-1">{result.title}</p>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          {result.country && <span>{COUNTRY_FLAG[result.country] || ''}</span>}
          <span>{result.name || result.channelTitle}</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="bg-black/30 rounded-lg p-1.5">
          <p className="text-[8px] text-gray-500 uppercase">조회수</p>
          <p className="text-[11px] text-blue-400 font-bold">{formatNumber(result.views)}</p>
        </div>
        <div className="bg-black/30 rounded-lg p-1.5">
          <p className="text-[8px] text-gray-500 uppercase flex items-center justify-center gap-0.5"><ThumbsUp size={7}/>좋아요</p>
          <p className="text-[11px] text-pink-400 font-bold">{formatNumber(result.likes)}</p>
        </div>
        <div className="bg-black/30 rounded-lg p-1.5">
          <p className="text-[8px] text-gray-500 uppercase">참여율</p>
          <p className="text-[11px] text-violet-400 font-bold">{formatRate(result.engagement)}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <select className="flex-1 bg-gray-800 text-gray-300 text-xs px-2 py-1.5 rounded-lg border border-gray-700 focus:outline-none cursor-pointer" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
          {categories.length > 0 ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option value="">카테고리 없음</option>}
        </select>
        <button onClick={() => onSave(result, selectedCategory, 'video')} className="bg-white text-black text-xs px-3 py-1.5 rounded-lg font-bold transition active:scale-95">저장</button>
        <button onClick={() => onAnalyze(result)} className="p-1.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"><BarChart3 size={14}/></button>
      </div>
    </div>
  );
};

// ─── MiniBarChart ──────────────────────────────────────────────────────────────
const MiniBarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.views), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <span className="text-gray-600 w-4 shrink-0 text-right">{i+1}</span>
          <div className="flex-1 bg-white/5 rounded h-5 overflow-hidden relative">
            <div className="h-full bg-gradient-to-r from-red-700/80 to-red-500/60 rounded transition-all" style={{width:`${d.views/max*100}%`}}/>
            <span className="absolute right-2 top-0 h-full flex items-center text-gray-400 font-bold">{formatNumber(d.views)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── DayPatternChart ───────────────────────────────────────────────────────────
const DayPatternChart = ({ data }) => {
  if (!data) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex gap-1.5 items-end h-20 bg-black/30 p-3 rounded-2xl border border-white/5">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 justify-end">
          <span className="text-[9px] text-purple-400 font-bold">{d.count > 0 ? d.count : ''}</span>
          <div className="w-full rounded-t transition-all" style={{height:`${Math.max(d.count/max*44,d.count>0?4:0)}px`, background: d.count > 0 ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.05)'}}/>
          <span className="text-[9px] text-gray-500">{d.name}</span>
        </div>
      ))}
    </div>
  );
};

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [fbConfig, setFbConfig] = useState(() => {
    try {
      const s = localStorage.getItem('user-fb-config');
      if (s) return JSON.parse(s);
      if (ENV_FB_CONFIG.apiKey) return ENV_FB_CONFIG;
      return null;
    } catch { return null; }
  });
  const [configInput, setConfigInput] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hasStarted, setHasStarted] = useState(() => !!localStorage.getItem('app-started'));
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [analysisChannel, setAnalysisChannel] = useState(null);
  const [viewMode, setViewMode] = useState('search_video');
  const [apiKey, setApiKey] = useState(ENV_YOUTUBE_KEY || '');
  const [isApiKeySaved, setIsApiKeySaved] = useState(!!ENV_YOUTUBE_KEY);
  const [categories, setCategories] = useState([]);
  const [savedChannels, setSavedChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [videoResults, setVideoResults] = useState([]);
  const [channelResults, setChannelResults] = useState([]);
  const [trendingResults, setTrendingResults] = useState([]);
  const [trendingRegion, setTrendingRegion] = useState('KR');
  const [sortKey, setSortKey] = useState('views');
  const [directQuery, setDirectQuery] = useState('');
  const [activeTab, setActiveTab] = useState('전체');

  const [keywordFilter, setKeywordFilter] = useState({
    keyword: '', duration: 'any', videoLength: 'any', region: 'KR|ko', period: '30',
    customYear: new Date().getFullYear().toString(), customMonth: '01', customDay: '01',
    order: 'viewCount', minViews: '', maxViews: '', minSubs: '', maxSubs: '', maxResults: '25'
  });

  const fbServices = useMemo(() => {
    if (!fbConfig) return null;
    try {
      const exApps = getApps();
      const app = exApps.length > 0 ? exApps[0] : initializeApp(fbConfig);
      return { auth: getAuth(app), db: getFirestore(app) };
    } catch { return "ERROR"; }
  }, [fbConfig]);

  useEffect(() => {
    if (!fbServices || fbServices === "ERROR") { setIsAuthLoading(false); return; }
    const unsub = onAuthStateChanged(fbServices.auth, u => {
      setUser(u);
      if (u) { setHasStarted(true); localStorage.setItem('app-started', 'true'); }
      setIsAuthLoading(false);
    });
    return unsub;
  }, [fbServices]);

  useEffect(() => {
    if (!fbServices || fbServices === "ERROR" || !user || !hasStarted) return;
    const { db } = fbServices;
    const u1 = onSnapshot(collection(db,'artifacts',appId,'users',user.uid,'categories'), s => setCategories(s.docs.map(d => ({id:d.id,...d.data()}))));
    const u2 = onSnapshot(collection(db,'artifacts',appId,'users',user.uid,'channels'), s => setSavedChannels(s.docs.map(d => ({id:d.id,...d.data()}))));
    const u3 = onSnapshot(doc(db,'artifacts',appId,'users',user.uid,'settings','youtube'), d => { if(d.exists()) { setApiKey(d.data().key); setIsApiKeySaved(true); }});
    return () => { u1(); u2(); u3(); };
  }, [fbServices, user, hasStarted]);

  const handleSearch = async (type) => {
    if (!apiKey) { alert("API 키를 설정하세요."); return; }
    setIsLoading(true);
    setSearchError('');
    type === 'direct' ? setViewMode('search_channel') : setViewMode('search_video');
    try {
      if (type === 'direct') {
        let url = '';
        const q = directQuery.trim();
        if (q.startsWith('@')) {
          url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(q)}&key=${apiKey}`;
        } else if (q.includes('youtube.com/')) {
          const match = q.match(/\/(?:channel\/|@)([\w-]+)/);
          if (match) url = q.includes('/channel/')
            ? `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${match[1]}&key=${apiKey}`
            : `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=@${match[1]}&key=${apiKey}`;
        }
        if (url) {
          const data = await (await fetch(url)).json();
          if (data.items?.length) {
            setChannelResults(data.items.map(c => {
              const views = parseInt(c.statistics.viewCount||0);
              const videos = parseInt(c.statistics.videoCount||1);
              const ageDays = Math.max((Date.now()-new Date(c.snippet.publishedAt).getTime())/86400000,1);
              return { channelId:c.id, name:c.snippet.title, thumbnail:c.snippet.thumbnails.medium?.url,
                subs:parseInt(c.statistics.subscriberCount||0), views, country:c.snippet.country||'',
                uploadRate:videos/ageDays, publishTime:c.snippet.publishedAt,
                date:new Date(c.snippet.publishedAt).toLocaleDateString(), type:'channel' };
            }));
            setIsLoading(false); return;
          }
        }
        const sData = await (await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=10&q=${encodeURIComponent(q)}&key=${apiKey}`)).json();
        const cIds = sData.items?.map(i => i.id.channelId).join(',');
        if (cIds) {
          const dData = await (await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${cIds}&key=${apiKey}`)).json();
          setChannelResults(dData.items?.map(c => {
            const views = parseInt(c.statistics.viewCount||0);
            const videos = parseInt(c.statistics.videoCount||1);
            const ageDays = Math.max((Date.now()-new Date(c.snippet.publishedAt).getTime())/86400000,1);
            return { channelId:c.id, name:c.snippet.title, thumbnail:c.snippet.thumbnails.medium?.url,
              subs:parseInt(c.statistics.subscriberCount||0), views, country:c.snippet.country||'',
              uploadRate:videos/ageDays, publishTime:c.snippet.publishedAt,
              date:new Date(c.snippet.publishedAt).toLocaleDateString(), type:'channel' };
          }) || []);
        }
      } else {
        const [reg, lng] = keywordFilter.region.split('|');
        const pubAfter = keywordFilter.period === 'custom'
          ? new Date(parseInt(keywordFilter.customYear), parseInt(keywordFilter.customMonth)-1, parseInt(keywordFilter.customDay)||1).toISOString()
          : new Date(Date.now()-parseInt(keywordFilter.period)*86400000).toISOString();
        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${keywordFilter.maxResults}&q=${encodeURIComponent(keywordFilter.keyword)}&key=${apiKey}&order=${keywordFilter.order}&publishedAfter=${pubAfter}`;
        if (reg) url += `&regionCode=${reg}`;
        if (lng) url += `&relevanceLanguage=${lng}`;
        if (keywordFilter.duration !== 'any') url += `&videoDuration=${keywordFilter.duration}`;
        const searchRes = await (await fetch(url)).json();
        console.log('[YT Search Response]', searchRes);
        if (searchRes.error) {
          const e = searchRes.error;
          const msg = e.errors?.[0]?.reason || e.message || '알 수 없는 오류';
          const ERRORS = {
            quotaExceeded: 'API 일일 할당량(10,000유닛) 초과 — 내일 다시 시도하세요.',
            keyInvalid: 'API 키가 유효하지 않습니다.',
            accessNotConfigured: 'YouTube Data API v3가 활성화되지 않았습니다. Google Cloud Console에서 활성화하세요.',
            forbidden: 'API 접근 권한이 없습니다. 도메인 제한 또는 키 설정을 확인하세요.',
          };
          setSearchError(ERRORS[msg] || `YouTube API 오류: ${e.message} (${e.code})`);
          return;
        }
        const items = searchRes.items || [];
        const vIds = items.map(i => i.id.videoId).join(',');
        if (!vIds) { setSearchError('검색 결과가 없습니다. 키워드나 기간을 바꿔보세요.'); return; }
        if (vIds) {
          const vData = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${vIds}&key=${apiKey}`)).json();
          const vMap = {}; vData.items?.forEach(v => vMap[v.id] = v);
          const cIds = [...new Set(items.map(i => i.snippet.channelId))].join(',');
          const cData = await (await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${cIds}&key=${apiKey}`)).json();
          const cMap = {}; cData.items?.forEach(c => cMap[c.id] = c);
          let final = items.map(i => {
            const vF = vMap[i.id.videoId] || { statistics:{}, contentDetails:{} };
            const chF = cMap[i.snippet.channelId] || { statistics:{}, snippet:{} };
            const views = parseInt(vF.statistics.viewCount||0);
            const subs = parseInt(chF.statistics.subscriberCount||1);
            const likes = parseInt(vF.statistics.likeCount||0);
            const comments = parseInt(vF.statistics.commentCount||0);
            const videos = parseInt(chF.statistics.videoCount||1);
            const ageDays = Math.max((Date.now()-new Date(chF.snippet.publishedAt||0).getTime())/86400000,1);
            const dSecs = getDurationSeconds(vF.contentDetails?.duration);
            return {
              videoId:i.id.videoId, channelId:i.snippet.channelId,
              title:i.snippet.title, thumbnail:i.snippet.thumbnails.medium?.url,
              views, subs, likes, comments,
              efficiency: views/Math.max(subs,1),
              likeRate: likes/Math.max(views,1)*100,
              engagement: (likes+comments)/Math.max(views,1)*100,
              uploadRate: videos/ageDays,
              country: chF.snippet?.country||'',
              definition: vF.contentDetails?.definition||'',
              caption: vF.contentDetails?.caption||'',
              durationSecs: dSecs,
              publishTime:i.snippet.publishedAt,
              type:'video', date:new Date(i.snippet.publishedAt).toLocaleDateString()
            };
          });
          if (keywordFilter.minViews) final = final.filter(r => r.views >= parseInt(keywordFilter.minViews));
          if (keywordFilter.maxViews) final = final.filter(r => r.views <= parseInt(keywordFilter.maxViews));
          if (keywordFilter.minSubs) final = final.filter(r => r.subs >= parseInt(keywordFilter.minSubs));
          if (keywordFilter.maxSubs) final = final.filter(r => r.subs <= parseInt(keywordFilter.maxSubs));
          if (keywordFilter.videoLength === 'shorts_under1') final = final.filter(r => r.durationSecs < 60);
          else if (keywordFilter.videoLength === 'shorts_1to3') final = final.filter(r => r.durationSecs >= 60 && r.durationSecs < 180);
          else if (keywordFilter.videoLength === 'long_under10') final = final.filter(r => r.durationSecs >= 180 && r.durationSecs < 600);
          else if (keywordFilter.videoLength === 'long_over10') final = final.filter(r => r.durationSecs >= 600);
          setVideoResults(final);
        }
      }
    } catch(e) { console.error(e); setSearchError(`네트워크 오류: ${e.message}`); } finally { setIsLoading(false); }
  };

  const handleFetchTrending = async (region = trendingRegion) => {
    if (!apiKey) { alert("API 키를 설정하세요."); return; }
    setIsTrendingLoading(true);
    try {
      const data = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&chart=mostPopular&regionCode=${region}&maxResults=25&key=${apiKey}`)).json();
      const items = data.items || [];
      const cIds = [...new Set(items.map(i => i.snippet.channelId))].join(',');
      const cData = await (await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${cIds}&key=${apiKey}`)).json();
      const cMap = {}; cData.items?.forEach(c => cMap[c.id] = c);
      setTrendingResults(items.map((v, idx) => {
        const chF = cMap[v.snippet.channelId] || { statistics:{}, snippet:{} };
        const views = parseInt(v.statistics.viewCount||0);
        const subs = parseInt(chF.statistics?.subscriberCount||1);
        const likes = parseInt(v.statistics.likeCount||0);
        const comments = parseInt(v.statistics.commentCount||0);
        return {
          rank: idx+1, videoId: v.id, channelId: v.snippet.channelId,
          title: v.snippet.title, thumbnail: v.snippet.thumbnails.medium?.url,
          name: v.snippet.channelTitle, views, subs, likes, comments,
          efficiency: views/Math.max(subs,1),
          likeRate: likes/Math.max(views,1)*100,
          engagement: (likes+comments)/Math.max(views,1)*100,
          duration: parseISO8601Duration(v.contentDetails?.duration),
          definition: v.contentDetails?.definition||'',
          caption: v.contentDetails?.caption||'',
          country: chF.snippet?.country||'',
          publishTime: v.snippet.publishedAt, type:'video',
          date: new Date(v.snippet.publishedAt).toLocaleDateString()
        };
      }));
    } catch(e) { console.error(e); } finally { setIsTrendingLoading(false); }
  };

  const exportToCSV = () => {
    const headers = ['이름/제목','타입','구독자','조회수','좋아요','참여율(%)','효율','좋아요율(%)','카테고리','메모','저장일'];
    const rows = savedChannels.map(ch => [
      ch.name||ch.title||'', ch.type||'channel',
      ch.subs||0, ch.views||0, ch.likes||0,
      ch.engagement ? ch.engagement.toFixed(2) : '',
      ch.efficiency ? ch.efficiency.toFixed(2) : '',
      ch.likeRate ? ch.likeRate.toFixed(2) : '',
      ch.category||'', ch.memo||'', ch.date||''
    ]);
    const csv = [headers,...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`yt-finder-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    if (fbServices && fbServices !== "ERROR") {
      try { await signOut(fbServices.auth); localStorage.removeItem('app-started'); window.location.reload(); } catch(e) { console.error(e); }
    }
  };

  const saveChannel = (r, c, t) => addDoc(collection(fbServices.db,'artifacts',appId,'users',user.uid,'channels'), {...r, category:c, type:t, timestamp:Date.now()});

  const sortedVideos = useMemo(() => [...videoResults].sort((a,b) => {
    if (sortKey==='latest') return new Date(b.publishTime)-new Date(a.publishTime);
    if (sortKey==='frequency') return (b.uploadRate||0)-(a.uploadRate||0);
    if (sortKey==='engagement') return (b.engagement||0)-(a.engagement||0);
    if (sortKey==='health') return calcHealthScore(b)-calcHealthScore(a);
    if (sortKey==='gem') {
      const gemScore = r => (r.efficiency||0) * (r.engagement||0) / Math.max(r.subs||1, 1000) * 1000000;
      return gemScore(b)-gemScore(a);
    }
    return (b[sortKey]||0)-(a[sortKey]||0);
  }), [videoResults, sortKey]);

  const sortedChannels = useMemo(() => [...channelResults].sort((a,b) => {
    if (sortKey==='latest') return new Date(b.publishTime)-new Date(a.publishTime);
    if (sortKey==='frequency') return (b.uploadRate||0)-(a.uploadRate||0);
    if (sortKey==='health') return calcHealthScore(b)-calcHealthScore(a);
    if (sortKey==='gem') {
      const gemScore = r => (r.efficiency||0) * (r.engagement||0) / Math.max(r.subs||1, 1000) * 1000000;
      return gemScore(b)-gemScore(a);
    }
    return (b[sortKey]||0)-(a[sortKey]||0);
  }), [channelResults, sortKey]);

  const filteredSaved = useMemo(() => savedChannels.filter(ch => activeTab==='전체'||ch.category===activeTab), [savedChannels, activeTab]);

  if (isAuthLoading) return <div className="h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white font-sans"><RefreshCw size={48} className="text-blue-600 animate-spin mb-4"/><p className="font-bold">시스템 초기화 중...</p></div>;

  if (!fbConfig || !hasStarted || !user) {
    return (
      <div className="h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-2xl w-full space-y-8 bg-[#1e1e1e] p-10 md:p-14 rounded-[3rem] border border-gray-800 shadow-2xl no-scrollbar overflow-y-auto max-h-full">
          {!fbConfig ? (
            <div className="space-y-8 w-full">
              <Database size={48} className="text-blue-600 mx-auto animate-pulse"/>
              <h1 className="text-4xl font-bold italic uppercase">Server Connect</h1>
              <textarea value={configInput} onChange={e => setConfigInput(e.target.value)} placeholder="Firebase Config JSON을 붙여넣으세요." className="w-full bg-[#0b0b0b] border border-gray-800 rounded-2xl p-5 text-[11px] h-40 outline-none focus:border-blue-600 font-mono text-blue-100"/>
              <button onClick={() => {
                try {
                  const match = configInput.match(/\{[\s\S]*\}/);
                  if (!match) throw new Error();
                  let parsed;
                  try { parsed = JSON.parse(match[0]); }
                  catch { parsed = Function('"use strict"; return (' + match[0] + ')')(); }
                  if (!parsed.apiKey) throw new Error();
                  localStorage.setItem('user-fb-config', JSON.stringify(parsed)); setFbConfig(parsed);
                } catch { alert("연결 정보 형식이 올바르지 않습니다. Firebase 콘솔의 firebaseConfig 전체를 붙여넣어 주세요."); }
              }} className="w-full bg-blue-600 py-5 rounded-[1.5rem] font-bold active:scale-95 transition">연결하기</button>
            </div>
          ) : (
            <div className="space-y-10 w-full">
              <CheckCircle size={48} className="text-green-500 mx-auto"/>
              <h1 className="text-4xl uppercase tracking-tighter italic font-bold">Connected</h1>
              <button onClick={() => signInWithPopup(fbServices.auth, new GoogleAuthProvider())} className="w-full bg-white text-black py-7 rounded-[1.8rem] text-xl font-bold flex items-center justify-center gap-3 active:scale-95 transition"><LogIn size={26} className="text-blue-600"/> Google 로그인</button>
              <button onClick={() => signInAnonymously(fbServices.auth)} className="w-full border border-gray-700 text-gray-400 py-5 rounded-[1.5rem] font-bold hover:text-white transition">게스트 시작</button>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-xs text-gray-600 underline">설정 초기화</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f0f0f] text-white flex flex-col md:flex-row tracking-tight font-sans overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-full md:w-80 h-full border-r border-gray-800 p-6 flex flex-col gap-5 overflow-y-auto no-scrollbar bg-[#0f0f0f] z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Youtube className="text-red-600" size={32}/><h1 className="text-xl italic font-bold">YT Finder</h1></div>
          <button onClick={handleLogout} className="p-2 bg-gray-800 rounded-xl hover:bg-red-600 transition" title="Logout"><LogOut size={16}/></button>
        </div>

        <div className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800 flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${user?.photoURL?'':'bg-blue-600'} flex items-center justify-center overflow-hidden border border-blue-400 shrink-0`}>
            {user?.photoURL ? <img src={user.photoURL} alt=""/> : <User size={16}/>}
          </div>
          <div className="min-w-0">
            <p className="text-xs truncate font-bold">{user?.displayName||"Guest User"}</p>
            <p className="text-[9px] text-gray-500 uppercase">{user?.isAnonymous?"Local Only":"Sync Active"}</p>
          </div>
        </div>

        {/* API Key */}
        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800">
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-3 uppercase tracking-widest"><Settings size={14}/> YouTube API</h2>
          {!isApiKeySaved ? (
            <div className="space-y-2">
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="API Key" className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none"/>
              <button onClick={() => { setDoc(doc(fbServices.db,'artifacts',appId,'users',user.uid,'settings','youtube'),{key:apiKey}); setIsApiKeySaved(true); }} className="w-full bg-green-600 py-2 rounded-xl text-xs font-bold active:scale-95 transition">키 저장</button>
            </div>
          ) : (
            <div className="flex justify-between items-center text-green-500">
              <span className="text-xs font-bold">API 활성화됨</span>
              <button onClick={() => setIsApiKeySaved(false)} className="text-[10px] text-gray-500 underline">변경</button>
            </div>
          )}
        </section>

        {/* 필터 검색 */}
        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800">
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-4 uppercase tracking-widest"><Video size={14}/> 필터 검색 (동영상)</h2>
          <div className="space-y-3">
            <input value={keywordFilter.keyword} onChange={e => setKeywordFilter({...keywordFilter,keyword:e.target.value})} onKeyDown={e => e.key==='Enter'&&handleSearch('keyword')} placeholder="검색 키워드" className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none"/>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 flex items-center gap-1"><Globe size={10}/> 국가/언어</label>
              <select value={keywordFilter.region} onChange={e => setKeywordFilter({...keywordFilter,region:e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none cursor-pointer">
                <option value="KR|ko">🇰🇷 대한민국</option><option value="US|en">🇺🇸 미국</option>
                <option value="JP|ja">🇯🇵 일본</option><option value="GB|en">🇬🇧 영국</option>
                <option value="DE|de">🇩🇪 독일</option><option value="|">🌍 글로벌</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500">기간</label>
              <select value={keywordFilter.period} onChange={e => setKeywordFilter({...keywordFilter,period:e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none cursor-pointer">
                <option value="7">최근 7일</option><option value="14">최근 14일</option>
                <option value="30">최근 30일</option><option value="365">최근 1년</option>
                <option value="custom">직접 지정</option>
              </select>
            </div>
            {keywordFilter.period === 'custom' && (
              <div className="grid grid-cols-3 gap-1">
                <select value={keywordFilter.customYear} onChange={e=>setKeywordFilter({...keywordFilter,customYear:e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg">
                  {[2026,2025,2024,2023].map(y=><option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={keywordFilter.customMonth} onChange={e=>setKeywordFilter({...keywordFilter,customMonth:e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg">
                  {Array.from({length:12},(_,i)=>(i+1).toString().padStart(2,'0')).map(m=><option key={m} value={m}>{m}월</option>)}
                </select>
                <input value={keywordFilter.customDay} onChange={e=>setKeywordFilter({...keywordFilter,customDay:e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg" placeholder="1일"/>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500">영상 길이</label>
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-2 gap-1">
                  {[
                    {val:'any',          label:'전체'},
                    {val:'shorts_under1',label:'숏폼 1분↓'},
                    {val:'shorts_1to3',  label:'숏폼 1~3분'},
                    {val:'long_under10', label:'롱폼 10분↓'},
                  ].map(o => (
                    <button key={o.val} onClick={()=>setKeywordFilter({...keywordFilter,videoLength:o.val})}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition ${keywordFilter.videoLength===o.val?'bg-white text-black border-white':'border-gray-800 text-gray-400 hover:text-white'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <button onClick={()=>setKeywordFilter({...keywordFilter,videoLength:'long_over10'})}
                  className={`w-full py-1.5 rounded-lg text-[10px] font-bold border transition ${keywordFilter.videoLength==='long_over10'?'bg-white text-black border-white':'border-gray-800 text-gray-400 hover:text-white'}`}>
                  롱폼 10분↑
                </button>
              </div>
            </div>
            <button onClick={()=>setIsAdvancedOpen(!isAdvancedOpen)} className="text-[11px] text-gray-500 flex items-center gap-1 hover:text-white transition py-1">
              {isAdvancedOpen?<ChevronUp size={14}/>:<ChevronDown size={14}/>} {isAdvancedOpen?"고급 옵션 닫기":"고급 수치 필터"}
            </button>
            {isAdvancedOpen && (
              <div className="space-y-2 p-3 bg-black/30 rounded-xl border border-white/5">
                <div className="grid grid-cols-2 gap-2">
                  <div><p className="text-[9px] text-gray-500 uppercase mb-1">최소 조회수</p><input value={keywordFilter.minViews} onChange={e=>setKeywordFilter({...keywordFilter,minViews:e.target.value})} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs" placeholder="0"/></div>
                  <div><p className="text-[9px] text-gray-500 uppercase mb-1">최대 조회수</p><input value={keywordFilter.maxViews} onChange={e=>setKeywordFilter({...keywordFilter,maxViews:e.target.value})} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs" placeholder="Max"/></div>
                  <div><p className="text-[9px] text-gray-500 uppercase mb-1">최소 구독자</p><input value={keywordFilter.minSubs} onChange={e=>setKeywordFilter({...keywordFilter,minSubs:e.target.value})} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs" placeholder="0"/></div>
                  <div><p className="text-[9px] text-gray-500 uppercase mb-1">최대 구독자</p><input value={keywordFilter.maxSubs} onChange={e=>setKeywordFilter({...keywordFilter,maxSubs:e.target.value})} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs" placeholder="Max"/></div>
                </div>
                <div><p className="text-[9px] text-gray-500 uppercase mb-1">결과 개수</p>
                  <select value={keywordFilter.maxResults} onChange={e=>setKeywordFilter({...keywordFilter,maxResults:e.target.value})} className="bg-black border border-gray-800 w-full p-2 rounded-lg text-xs">
                    <option value="10">10개</option><option value="25">25개</option><option value="50">50개</option>
                  </select>
                </div>
              </div>
            )}
            <button onClick={()=>handleSearch('keyword')} disabled={isLoading} className="w-full bg-blue-600 py-3 rounded-xl text-xs font-bold uppercase transition hover:bg-blue-700 active:scale-95 disabled:opacity-50">동영상 검색</button>
          </div>
        </section>

        {/* 채널 직통 검색 */}
        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800">
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-4 uppercase tracking-widest"><Users size={14}/> 채널 직통 검색</h2>
          <div className="space-y-2">
            <input value={directQuery} onChange={e=>setDirectQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSearch('direct')} placeholder="채널명, @핸들, URL" className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none"/>
            <button onClick={()=>handleSearch('direct')} disabled={isLoading} className="w-full bg-red-600 py-2.5 rounded-xl text-[11px] font-bold uppercase active:scale-95 transition disabled:opacity-50">채널 검색</button>
          </div>
        </section>

        {/* 트렌딩 */}
        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800">
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-4 uppercase tracking-widest"><Flame size={14} className="text-orange-500"/> 트렌딩</h2>
          <div className="space-y-2">
            <select value={trendingRegion} onChange={e=>setTrendingRegion(e.target.value)} className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none cursor-pointer">
              <option value="KR">🇰🇷 대한민국</option><option value="US">🇺🇸 미국</option>
              <option value="JP">🇯🇵 일본</option><option value="GB">🇬🇧 영국</option>
              <option value="DE">🇩🇪 독일</option>
            </select>
            <button onClick={()=>{ setViewMode('trending'); handleFetchTrending(trendingRegion); }} disabled={isTrendingLoading} className="w-full bg-orange-600 py-2.5 rounded-xl text-[11px] font-bold uppercase active:scale-95 transition disabled:opacity-50">
              {isTrendingLoading ? '로딩 중...' : '트렌딩 보기'}
            </button>
          </div>
        </section>

        <button onClick={()=>setIsGuideOpen(true)} className="mt-auto text-[10px] text-gray-500 flex items-center justify-center gap-1 hover:text-white transition underline underline-offset-2">설정 가이드 보기</button>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#0f0f0f]">
        <header className="p-8 pb-4 text-center shrink-0">
          <h1 className="text-4xl font-black italic uppercase text-white drop-shadow-lg">유튜브 채널 탐색기</h1>
        </header>

        <nav className="px-8 mt-6 shrink-0">
          <div className="flex gap-4 border-b border-gray-800 uppercase text-xs tracking-widest">
            {[
              { key:'search_video', label:'필터검색', color:'blue', count:videoResults.length },
              { key:'search_channel', label:'채널검색', color:'red', count:channelResults.length },
              { key:'saved', label:'저장목록', color:'green', count:savedChannels.length },
              { key:'trending', label:'트렌딩', color:'orange', count:trendingResults.length },
            ].map(tab => (
              <button key={tab.key} onClick={()=>{ setViewMode(tab.key); if(tab.key==='trending'&&trendingResults.length===0) handleFetchTrending(); }} className={`pb-3 px-3 flex items-center gap-2 transition font-bold ${viewMode===tab.key ? `text-${tab.color}-500 border-b-2 border-${tab.color}-500` : 'text-gray-500 hover:text-white'}`}>
                {tab.label}
                <span className={`bg-${tab.color}-500/20 text-${tab.color}-500 px-1.5 py-0.5 rounded-full text-[9px]`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="px-8 mt-4 flex items-center justify-between shrink-0">
          {viewMode === 'saved' ? (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 flex-1">
              <button onClick={()=>setActiveTab('전체')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition ${activeTab==='전체'?'bg-white text-black border-white':'border-gray-800 text-gray-400 hover:text-white'}`}>전체</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={()=>setActiveTab(cat.name)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition flex items-center gap-2 ${activeTab===cat.name?'bg-orange-600 text-white border-orange-600':'border-gray-800 text-gray-400 hover:text-white'}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400"/>{cat.name}
                </button>
              ))}
              <button onClick={()=>setIsModalOpen(true)} className="p-1.5 text-gray-500 hover:text-white"><FolderEdit size={16}/></button>
              <div className="ml-auto flex gap-2 shrink-0">
                <button onClick={()=>setIsCompareOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition"><BarChart2 size={13}/> 채널 비교</button>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border border-green-500/50 text-green-400 hover:bg-green-500/10 transition"><Download size={13}/> CSV 내보내기</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
              <span className="text-[10px] text-gray-500 uppercase mr-2">Sort:</span>
              {[
                {label:"조회수",key:"views"},{label:"효율",key:"efficiency"},{label:"구독자",key:"subs"},
                {label:"참여율",key:"engagement"},{label:"최신",key:"latest"},{label:"빈도",key:"frequency"},
                {label:"건강도",key:"health"},{label:"💎숨은보석",key:"gem"}
              ].map(s => (
                <button key={s.key} onClick={()=>setSortKey(s.key)} className={`px-3 py-1.5 rounded-full text-[11px] border transition font-bold ${sortKey===s.key?'bg-white text-black border-white':'border-gray-800 text-gray-400 hover:text-white'}`}>{s.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-8 flex-1 overflow-y-auto no-scrollbar">
          {searchError && (
            <div className="mb-4 flex items-start gap-3 bg-red-600/10 border border-red-600/30 rounded-2xl p-4 text-sm text-red-400">
              <X size={16} className="shrink-0 mt-0.5"/>
              <span>{searchError}</span>
              <button onClick={()=>setSearchError('')} className="ml-auto shrink-0 text-red-600 hover:text-red-400"><X size={14}/></button>
            </div>
          )}
          {(isLoading || isTrendingLoading) ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Loader2 size={48} className="animate-spin text-red-600 mb-4 opacity-50"/>
              <p className="font-bold uppercase tracking-widest">데이터 분석 중...</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${viewMode==='trending' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
              {viewMode === 'search_video' && (
                sortedVideos.length > 0 ? sortedVideos.map(res => <ChannelCard key={res.videoId} result={res} onSave={saveChannel} onAnalyze={setAnalysisChannel} isSavedView={false} categories={categories} mode="video" onUpdateCategory={()=>{}} onUpdateMemo={()=>{}}/>) :
                <div className="col-span-full h-64 flex items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-3xl">동영상 키워드 검색 결과가 여기에 표시됩니다.</div>
              )}
              {viewMode === 'search_channel' && (
                sortedChannels.length > 0 ? sortedChannels.map(res => <ChannelCard key={res.channelId} result={res} onSave={saveChannel} onAnalyze={setAnalysisChannel} isSavedView={false} categories={categories} mode="channel" onUpdateCategory={()=>{}} onUpdateMemo={()=>{}}/>) :
                <div className="col-span-full h-64 flex items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-3xl">직통 검색된 채널 목록이 여기에 표시됩니다.</div>
              )}
              {viewMode === 'saved' && (
                filteredSaved.length > 0 ? filteredSaved.map(ch => <ChannelCard key={ch.id} result={ch} onRemove={id=>deleteDoc(doc(fbServices.db,'artifacts',appId,'users',user.uid,'channels',id))} onUpdateCategory={(id,c)=>updateDoc(doc(fbServices.db,'artifacts',appId,'users',user.uid,'channels',id),{category:c})} onUpdateMemo={(id,m)=>updateDoc(doc(fbServices.db,'artifacts',appId,'users',user.uid,'channels',id),{memo:m})} onAnalyze={setAnalysisChannel} isSavedView={true} categories={categories} mode={ch.type}/>) :
                <div className="col-span-full h-64 flex items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-3xl">저장된 채널이 없습니다.</div>
              )}
              {viewMode === 'trending' && (
                trendingResults.length > 0 ? trendingResults.map(res => <TrendingCard key={res.videoId} result={res} rank={res.rank} onSave={saveChannel} categories={categories} onAnalyze={setAnalysisChannel}/>) :
                <div className="col-span-full h-64 flex items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-3xl">왼쪽 사이드바에서 트렌딩 버튼을 눌러주세요.</div>
              )}
            </div>
          )}
        </div>
      </main>

      <CategoryModal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} categories={categories} onAdd={n=>addDoc(collection(fbServices.db,'artifacts',appId,'users',user.uid,'categories'),{name:n.trim()})} onDelete={id=>deleteDoc(doc(fbServices.db,'artifacts',appId,'users',user.uid,'categories',id))}/>
      <CompareModal isOpen={isCompareOpen} onClose={()=>setIsCompareOpen(false)} savedChannels={savedChannels}/>
      <AnalysisModal isOpen={!!analysisChannel} onClose={()=>setAnalysisChannel(null)} channel={analysisChannel} apiKey={apiKey}/>
      <SetupGuideModal isOpen={isGuideOpen} onClose={()=>setIsGuideOpen(false)}/>
      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}
