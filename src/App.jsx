import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Search, Plus, Trash2, ExternalLink, X, Save, FolderEdit, Youtube,
  Calendar, BookmarkPlus, ListVideo, Users, PlaySquare, Loader2, Edit3, Check, 
  Database, Info, AlertCircle, RefreshCw, ArrowRight, Zap, LogIn, LogOut, User, 
  CheckCircle, CheckCircle2, Video, BarChart3, TrendingUp, SortAsc, Clock, 
  Activity, ThumbsUp, ChevronDown, ChevronUp, Tag, Languages, Radio, Copy, Globe
} from 'lucide-react';

import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut, signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, query
} from 'firebase/firestore';

// 환경에 따른 App ID 설정
const appId = typeof __app_id !== 'undefined' ? __app_id : "yt-finder-v1"; 

// --- 환경 변수 안전 로드 로직 (ES2015 및 JSX 호환) ---
const getSafeEnv = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    return '';
  } catch (e) {
    return '';
  }
};

const ENV_FB_CONFIG = {
  apiKey: getSafeEnv('VITE_FB_API_KEY'),
  authDomain: getSafeEnv('VITE_FB_AUTH_DOMAIN'),
  projectId: getSafeEnv('VITE_FB_PROJECT_ID'),
  storageBucket: getSafeEnv('VITE_FB_STORAGE_BUCKET'),
  messagingSenderId: getSafeEnv('VITE_FB_MESSAGING_SENDER_ID'),
  appId: getSafeEnv('VITE_FB_APP_ID')
};

const ENV_YOUTUBE_KEY = getSafeEnv('VITE_YOUTUBE_API_KEY');

// --- 데이터 및 유틸리티 ---
const VIDEO_CATEGORIES = {
    "1": "영화/애니메이션", "2": "자동차", "10": "음악", "15": "애완동물/동물", "17": "스포츠",
    "18": "단편영화", "19": "여행/이벤트", "20": "게임", "21": "일상/브이로그", "22": "인물/블로그",
    "23": "코미디", "24": "엔터테인먼트", "25": "뉴스/정치", "26": "노하우/스타일", "27": "교육",
    "28": "과학기술", "29": "비영리/사회운동"
};

const formatNumber = (n) => {
  const num = parseInt(n || 0);
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "억";
  if (num >= 10000) return (num / 10000).toFixed(1) + "만";
  if (num >= 1000) return (num / 1000).toFixed(1) + "천";
  return num.toString();
};

const parseISO8601Duration = (duration) => {
    if (!duration) return "00:00";
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "00:00";
    const h = (parseInt(match[1]) || 0);
    const m = (parseInt(match[2]) || 0);
    const s = (parseInt(match[3]) || 0);
    return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`;
};

// --- 서브 컴포넌트 ---

const SetupGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 text-white font-bold">
      <div className="bg-[#1a1a1a] w-full max-w-2xl border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313]">
          <h2 className="text-xl flex items-center gap-2 font-bold"><Zap className="text-yellow-400" size={24} /> 상세 설정 가이드</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2"><X size={24} /></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-8 text-sm text-left font-bold font-sans">
          <section><h3 className="text-lg mb-2 font-bold text-blue-400">1. Firebase 연동</h3><p className="text-gray-400 font-medium">콘솔에서 생성한 웹 앱의 firebaseConfig 객체를 입력창에 붙여넣으세요.</p></section>
          <section><h3 className="text-lg mb-2 font-bold text-red-400">2. 도메인 승인</h3><p className="text-gray-400 font-medium mb-2">Google 로그인을 사용하려면 Firebase 콘솔 {'\u003E'} Auth {'\u003E'} 설정에서 현재 브라우저의 도메인을 [승인된 도메인]에 추가해야 합니다.</p></section>
          <section><h3 className="text-lg mb-2 font-bold text-green-400">3. YouTube Data API</h3><p className="text-gray-400 font-medium">Google Cloud Console에서 YouTube Data API v3를 활성화하고 API 키를 발급받아 사이드바에 입력하세요.</p></section>
        </div>
        <div className="p-6 bg-black/40 border-t border-gray-800 font-bold"><button onClick={onClose} className="w-full bg-blue-600 py-4 rounded-2xl font-bold shadow-xl transition active:scale-95 font-sans">확인했습니다</button></div>
      </div>
    </div>
  );
};

const CategoryModal = ({ isOpen, onClose, categories, onAdd, onDelete }) => {
  const [newCat, setNewCat] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-bold">
      <div className="bg-[#1e1e1e] w-full max-w-md border border-gray-800 rounded-2xl shadow-2xl overflow-hidden font-bold">
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#131313] text-white">
          <h2 className="text-xl flex items-center gap-2 font-bold font-sans"><FolderEdit size={20} className="text-red-500" /> 카테고리 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition font-bold font-sans"><X size={24} /></button>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-6 font-bold">
            <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="새 카테고리 명" className="flex-1 bg-[#2c2c2c] border border-gray-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-red-600 transition font-bold font-sans" onKeyDown={(e) => e.key === 'Enter' && (onAdd(newCat), setNewCat(''))} />
            <button onClick={() => { if(newCat.trim()) { onAdd(newCat); setNewCat(''); } }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold font-sans font-bold transition">추가</button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2 text-white no-scrollbar font-bold font-sans">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-4 bg-[#2c2c2c] rounded-xl group text-left font-bold">
                <span className="font-bold font-sans">{cat.name}</span>
                <button onClick={() => onDelete(cat.id)} className="text-gray-500 hover:text-red-500 transition opacity-0 group-hover:opacity-100 font-bold font-sans"><Trash2 size={18} /></button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-center text-gray-500 py-4 italic font-bold font-sans">등록된 카테고리가 없습니다.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalysisModal = ({ isOpen, onClose, channel, apiKey }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen && channel && apiKey) {
      const fetchAnalysis = async () => {
        setLoading(true);
        try {
          const cid = channel.channelId;
          const ago30 = new Date(Date.now() - 30 * 86400000).toISOString();
          const [chRes, sRes] = await Promise.all([
            fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,brandingSettings&id=${cid}&key=${apiKey}`),
            fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${cid}&type=video&order=date&maxResults=50&publishedAfter=${ago30}&key=${apiKey}`)
          ]);
          const chData = await chRes.json();
          const sData = await sRes.json();
          const videos = sData.items || [];
          const chFull = chData.items?.[0] || {};
          const branding = chFull.brandingSettings || {};
          
          let detVids = [];
          if (videos.length > 0) {
            const vids = videos.map(v => v.id.videoId).join(',');
            const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${vids}&key=${apiKey}`);
            const vData = await vRes.json();
            detVids = vData.items || [];
          }

          const dMap = {};
          for (let i = 0; i < 31; i++) dMap[new Date(Date.now() - i*86400000).toISOString().slice(0,10)] = 0;
          let uDays = 0;
          detVids.forEach(v => {
            const d = v.snippet.publishedAt.slice(0,10);
            if (dMap[d] !== undefined) { if(dMap[d]===0) uDays++; dMap[d]++; }
          });

          setStats({
            banner: branding.image?.bannerExternalUrl,
            keywords: branding.channel?.keywords ? branding.channel.keywords.split(' ') : [],
            dateMap: dMap,
            totalUploads: detVids.length,
            uploadDays: uDays,
            avgRecentViews: Math.round(detVids.reduce((a, v) => a + parseInt(v.statistics.viewCount || 0), 0) / (detVids.length || 1)),
            avgAllTimeViews: Math.round(parseInt(chFull.statistics?.viewCount || 0) / Math.max((Date.now() - new Date(chFull.snippet?.publishedAt).getTime()) / 86400000, 1)),
            subCount: chFull.statistics?.subscriberCount,
            maxViews: detVids.length ? Math.max(...detVids.map(v => parseInt(v.statistics.viewCount || 0))) : 0,
            recentVideos: detVids.slice(0, 10),
            isLive: chFull.snippet?.liveBroadcastContent === 'live'
          });
        } catch (e) { console.error(e); } finally { setLoading(false); }
      };
      fetchAnalysis();
    }
  }, [isOpen, channel, apiKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto font-bold font-sans font-bold">
      <div className="bg-[#1a1a1a] w-full max-w-3xl border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] text-white font-bold font-sans font-bold">
        {!loading && stats?.banner && (
            <div className="w-full h-32 md:h-40 overflow-hidden relative shrink-0">
                <img src={stats.banner} className="w-full h-full object-cover opacity-60 font-bold" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent font-bold font-sans"></div>
            </div>
        )}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313] shrink-0 relative z-10 font-bold font-sans">
          <div className="flex items-center gap-4 min-w-0 text-left font-bold font-sans font-bold">
            <div className={`w-16 h-16 rounded-full overflow-hidden border-2 border-red-600/50 bg-gray-800 shrink-0 ${stats?.banner ? '-mt-12 shadow-xl' : ''}`}>
              <img src={channel?.thumbnail || channel?.thumb} alt="" className="w-full h-full object-cover font-bold font-sans font-bold font-sans" />
            </div>
            <div className="min-w-0 font-bold font-bold font-bold font-sans">
              <h2 className="text-xl font-bold truncate font-sans font-bold">{channel?.name || channel?.title || channel?.channelTitle}</h2>
              <div className="flex items-center gap-2 mt-1 font-bold font-sans font-bold">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold font-sans font-bold font-sans">Channel Analysis</p>
                {stats?.isLive && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-1 font-bold font-sans font-bold font-sans"><Radio size={10}/> LIVE</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 bg-white/5 rounded-full font-bold font-sans font-bold font-sans"><X size={28} /></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-10 flex-1 text-left no-scrollbar font-bold font-sans font-bold font-sans">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 font-bold font-sans font-bold font-sans font-bold">
              <Loader2 className="animate-spin mb-4 font-bold" size={48} /><p className="uppercase tracking-widest text-xs font-sans font-bold font-sans font-bold">데이터 분석 중...</p>
            </div>
          ) : stats ? (
            <>
              {stats.keywords.length > 0 && (
                <section className="space-y-3 font-bold font-sans font-bold">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-sans font-bold"><Tag size={14} /> 채널 키워드</h3>
                  <div className="flex flex-wrap gap-2 font-bold font-sans font-bold">
                    {stats.keywords.slice(0, 8).map((kw, i) => (
                      <span key={i} className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[11px] text-gray-400 font-sans font-bold">#{kw.replace(/[",]/g, '')}</span>
                    ))}
                  </div>
                </section>
              )}
              <section className="space-y-4 font-bold font-sans font-bold">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-bold font-sans font-bold"><BarChart3 size={16} className="text-red-500 font-bold" /> 활동 요약</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-bold font-sans font-bold">
                    {[
                        { val: stats.totalUploads, label: "30일 업로드", color: "text-red-600 font-bold font-sans font-bold" },
                        { val: stats.totalUploads > 0 ? `${(30/stats.totalUploads).toFixed(1)}일` : "-", label: "빈도", color: "text-red-500 font-bold font-sans font-bold" },
                        { val: stats.uploadDays, label: "활동 날짜", color: "text-red-600 font-bold font-sans font-bold font-sans" },
                        { val: formatNumber(stats.maxViews), label: "최다 조회수", color: "text-red-500 font-bold font-sans font-bold font-sans" }
                    ].map((card, i) => (
                        <div key={i} className="bg-[#111] border border-gray-800 p-4 rounded-xl text-center shadow-inner font-bold font-sans font-bold">
                            <p className={`text-xl font-bold ${card.color} font-sans font-bold`}>{card.val}</p>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold font-sans font-bold font-sans font-bold">{card.label}</p>
                        </div>
                    ))}
                </div>
              </section>
              <section className="space-y-4 font-bold font-sans font-bold font-sans font-bold">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-bold font-sans font-bold font-sans font-bold font-sans font-bold"><TrendingUp size={16} className="text-green-500 font-bold" /> 조회수 분석</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold font-sans font-bold font-sans font-bold font-sans font-bold">
                  <div className="bg-orange-600/5 border border-orange-600/20 p-5 rounded-2xl text-center font-bold font-sans font-bold">
                    <p className="text-3xl font-bold text-orange-500 font-sans font-bold font-bold">{formatNumber(stats.avgRecentViews)}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold font-sans font-bold font-bold font-sans font-bold">최근 30일 평균</p>
                  </div>
                  <div className="bg-blue-600/5 border border-blue-600/20 p-5 rounded-2xl text-center font-bold font-sans font-bold font-sans font-bold">
                    <p className="text-3xl font-bold text-blue-500 font-sans font-bold font-bold font-bold font-bold">{formatNumber(stats.avgAllTimeViews)}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-sans font-bold">역대 일평균</p>
                  </div>
                </div>
              </section>
              <div className="space-y-4 text-left font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold font-sans font-bold"><Calendar size={16} className="font-bold font-bold font-bold font-bold" /> 업로드 달력 (30일)</h3>
                <div className="grid grid-cols-7 gap-2 bg-black/30 p-4 rounded-2xl border border-white/5 text-center font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold">
                  {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                    <div key={d} className="text-[9px] text-gray-600 font-bold mb-1 font-sans font-bold font-bold font-sans font-bold">{d}</div>
                  ))}
                  {Object.entries(stats.dateMap).reverse().map(([date, count]) => (
                    <div key={date} className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold ${count > 0 ? 'bg-red-600/20 border-red-600/40 text-red-500 shadow-lg font-bold font-bold font-bold font-bold' : 'bg-white/5 border-transparent text-gray-700 font-bold font-bold font-bold font-bold'}`}>
                      <span className="text-[9px] opacity-40 font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold">{date.split('-')[2]}</span>
                      {count > 0 && <span className="text-xs font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold">{count}</span>}
                    </div>
                  ))}
                </div>
              </div>
              {/* 최근 업로드 영상 10개 목록 복구 */}
              <div className="space-y-4 text-left font-bold font-sans font-bold font-sans font-bold">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 font-bold font-sans font-bold font-sans font-bold font-sans font-bold"><ListVideo size={16} className="font-bold" /> 최근 업로드 영상 (10개)</h3>
                <div className="grid grid-cols-1 gap-3 font-bold font-sans font-bold font-sans font-bold font-sans font-bold">
                  {stats.recentVideos.length > 0 ? stats.recentVideos.map(vid => {
                     const vV = parseInt(vid.statistics?.viewCount || 0);
                     const sC = parseInt(stats.subCount) || 1;
                     return (
                        <a key={vid.id} href={`https://www.youtube.com/watch?v=${vid.id}`} target="_blank" rel="noreferrer" className="flex gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 group transition font-bold font-sans font-bold">
                            <div className="w-28 aspect-video rounded overflow-hidden shrink-0 bg-gray-900 relative font-bold font-sans font-bold">
                                <img src={vid.snippet.thumbnails.medium?.url} className="w-full h-full object-cover font-bold font-sans font-bold" alt="" />
                                <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1.5 py-0.5 rounded font-bold text-white font-sans font-bold">{parseISO8601Duration(vid.contentDetails?.duration)}</div>
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-between font-bold font-sans font-bold font-sans font-bold">
                                <p className="text-[13px] text-white font-bold whitespace-normal line-clamp-2 leading-snug group-hover:text-red-400 transition font-sans font-bold">{vid.snippet.title}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-gray-500 font-bold font-sans font-bold">
                                    <span className="bg-red-600/10 text-red-500 px-1.5 rounded font-bold font-sans font-bold">{VIDEO_CATEGORIES[vid.snippet.categoryId] || "기타"}</span>
                                    <span className="flex items-center gap-1 font-bold font-sans font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-sans font-bold"><TrendingUp size={12}/> {formatNumber(vV)}</span>
                                    <span className="text-yellow-500 font-bold ml-auto font-sans font-bold">효율 {(vV/sC).toFixed(1)}배</span>
                                </div>
                            </div>
                        </a>
                     )
                  }) : <p className="text-sm text-gray-600 italic font-bold font-sans font-bold font-sans font-bold">최근 업로드된 영상이 없습니다.</p>}
                </div>
              </div>
            </>
          ) : null}
        </div>
        <div className="p-5 bg-[#131313] border-t border-gray-800 shrink-0 font-bold font-sans font-bold font-sans font-bold font-sans font-bold">
          <button onClick={onClose} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 shadow-lg font-sans font-bold font-sans font-bold font-sans font-bold">분석창 닫기</button>
        </div>
      </div>
    </div>
  );
};

const ChannelCard = ({ result, onRemove, onUpdateMemo, isSavedView, categories, onSave, onAnalyze, mode, onUpdateCategory }) => {
  const [selectedCategory, setSelectedCategory] = useState(result.category || '');
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [tempMemo, setTempMemo] = useState(result.memo || '');
  
  useEffect(() => { 
    if (!isSavedView && categories.length > 0 && !selectedCategory) setSelectedCategory(categories[0].name);
    if (isSavedView) setSelectedCategory(result.category);
  }, [categories, isSavedView, result.category]);

  const isVideo = mode === 'video' || result.type === 'video';

  return (
    <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all flex flex-col h-full text-white shadow-lg text-left font-bold font-sans font-bold font-sans font-bold">
      <div className="flex gap-4 mb-4 font-bold font-sans font-bold font-sans font-bold font-bold font-sans font-bold">
        <div onClick={() => onAnalyze(result)} className={`shrink-0 overflow-hidden shadow-inner flex items-center justify-center bg-gray-800 cursor-pointer hover:ring-2 hover:ring-red-500 transition font-bold font-sans font-bold font-sans font-bold ${isVideo ? 'w-24 h-14 rounded-lg' : 'w-16 h-16 rounded-full'}`}>
          <img src={result.thumbnail || result.thumb} alt="" className="w-full h-full object-cover font-bold font-sans font-bold font-sans font-bold" />
        </div>
        <div className="flex-1 min-w-0 font-bold font-sans font-bold font-sans font-bold font-bold font-sans font-bold">
          <h3 className="text-[13px] font-bold whitespace-normal line-clamp-2 leading-snug mb-1.5 h-10 font-bold font-sans font-bold font-sans font-bold font-sans font-bold">{result.title || result.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1 font-bold font-sans font-bold font-sans font-bold font-bold font-sans font-bold">
             <span className="bg-gray-800 text-gray-400 text-[9px] px-2 py-0.5 rounded-full uppercase font-bold font-sans font-bold font-sans font-bold font-sans font-bold font-sans font-bold">{(isVideo || result.videoId) ? 'Video' : 'Channel'}</span>
             {result.efficiency > 0 && <span className="bg-orange-600/20 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-bold font-sans font-bold font-sans font-bold font-sans font-bold font-sans font-bold">🔥 효율 {result.efficiency.toFixed(1)}배</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3 font-bold font-sans font-bold font-sans font-bold font-sans font-bold">
        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center font-bold font-sans font-bold">
          <p className="text-[9px] text-gray-500 uppercase font-bold text-left font-bold font-sans font-bold font-sans font-bold">Views</p>
          <p className="text-xs text-blue-400 font-bold font-bold font-sans font-bold font-sans font-bold">{formatNumber(result.views || 0)}</p>
        </div>
        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center font-bold font-sans font-bold">
          <p className="text-[9px] text-gray-500 uppercase font-bold text-left font-bold font-sans font-bold font-sans font-bold font-sans font-bold">Subs</p>
          <p className="text-xs text-green-400 font-bold font-bold font-sans font-bold font-sans font-bold font-sans font-bold">{formatNumber(result.subs || 0)}</p>
        </div>
      </div>
      {isSavedView ? (
        <div className="mb-4 flex-1 font-bold font-sans font-bold font-sans font-bold">
          <div className="flex items-center justify-between mb-2">
            <select value={selectedCategory} onChange={(e) => onUpdateCategory(result.id, e.target.value)} className="bg-yellow-600/10 text-yellow-500 text-[10px] px-2 py-0.5 rounded-lg border border-yellow-600/20 outline-none font-bold cursor-pointer font-sans font-bold font-sans font-bold">
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {!isEditingMemo ? <button onClick={() => setIsEditingMemo(true)} className="text-gray-500 hover:text-white transition font-bold font-sans font-bold font-sans font-bold"><Edit3 size={14} /></button> : <button onClick={() => { onUpdateMemo(result.id, tempMemo); setIsEditingMemo(false); }} className="text-green-500 hover:text-green-400 transition font-bold font-sans font-bold font-sans font-bold font-sans font-bold font-sans font-bold"><Check size={16} /></button>}
          </div>
          {isEditingMemo ? <textarea autoFocus value={tempMemo} onChange={(e) => setTempMemo(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 focus:border-red-600 outline-none resize-none h-20 transition font-sans font-bold font-sans font-bold font-sans font-bold font-sans font-bold font-bold" /> : <div className="bg-black/20 rounded-xl p-3 min-h-[40px] border border-white/5 text-left text-[11px] text-gray-400 line-clamp-3 font-sans font-bold font-sans font-bold font-sans font-bold font-sans font-bold font-bold font-bold font-sans font-bold">{result.memo || "작성된 메모가 없습니다."}</div>}
        </div>
      ) : (
        <div className="mb-4 font-bold font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-sans font-bold font-bold font-bold">
          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-sans font-bold font-bold font-bold font-sans font-bold font-bold">저장 위치</p>
          <select className="w-full bg-gray-800 text-gray-300 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none cursor-pointer font-bold font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.length > 0 ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option value="">카테고리 없음</option>}
          </select>
        </div>
      )}
      <div className="flex gap-2 mt-auto font-bold font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold font-bold">
        {!isSavedView ? <button onClick={() => onSave(result, selectedCategory, (isVideo || result.videoId) ? 'video' : 'channel')} className="flex-1 bg-white text-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 font-bold shadow-md font-sans font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-bold font-sans font-bold font-bold">저장하기</button> : (
          <button onClick={() => onRemove(result.id)} className="flex-1 bg-red-600/20 text-red-500 text-xs py-2.5 rounded-xl border border-red-600/30 hover:bg-red-600 hover:text-white transition font-bold font-sans font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold">삭제</button>
        )}
        <button onClick={() => onAnalyze(result)} className="p-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition shrink-0 flex items-center justify-center font-bold font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold" title="상세분석 font-bold font-sans font-bold font-sans font-bold font-bold font-sans font-bold font-bold font-bold font-sans font-bold font-bold"><BarChart3 size={16} className="font-bold" /></button>
      </div>
    </div>
  );
};

// --- 메인 앱 ---

export default function App() {
  const [fbConfig, setFbConfig] = useState(() => {
    try {
      const s = localStorage.getItem('user-fb-config');
      if (s) return JSON.parse(s);
      if (ENV_FB_CONFIG.apiKey) return ENV_FB_CONFIG;
      return null;
    } catch(e) { return null; }
  });

  const [configInput, setConfigInput] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hasStarted, setHasStarted] = useState(() => !!localStorage.getItem('app-started'));
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false); 
  const [analysisChannel, setAnalysisChannel] = useState(null);
  const [viewMode, setViewMode] = useState('search_video'); 
  const [apiKey, setApiKey] = useState(ENV_YOUTUBE_KEY || '');
  const [isApiKeySaved, setIsApiKeySaved] = useState(!!ENV_YOUTUBE_KEY);
  const [categories, setCategories] = useState([]);
  const [savedChannels, setSavedChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [videoResults, setVideoResults] = useState([]);
  const [channelResults, setChannelResults] = useState([]);
  const [sortKey, setSortKey] = useState('views');
  const [directQuery, setDirectQuery] = useState('');
  const [activeTab, setActiveTab] = useState('전체');
  
  const [keywordFilter, setKeywordFilter] = useState({ 
    keyword: '', duration: 'any', region: 'KR|ko', period: '30',
    customYear: new Date().getFullYear().toString(), customMonth: '01', customDay: '01',
    order: 'viewCount', minViews: '', maxViews: '', minSubs: '', maxSubs: '', maxResults: '25'
  });

  const fbServices = useMemo(() => {
    if (!fbConfig) return null;
    try { 
      const exApps = getApps();
      const app = exApps.length > 0 ? exApps[0] : initializeApp(fbConfig); 
      return { auth: getAuth(app), db: getFirestore(app) }; 
    } catch (err) { return "ERROR"; }
  }, [fbConfig]);

  useEffect(() => {
    if (!fbServices || fbServices === "ERROR") { setIsAuthLoading(false); return; }
    const unsubscribe = onAuthStateChanged(fbServices.auth, (u) => {
      setUser(u); 
      if (u) { setHasStarted(true); localStorage.setItem('app-started', 'true'); }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [fbServices]);

  useEffect(() => {
    if (!fbServices || fbServices === "ERROR" || !user || !hasStarted) return;
    const { db } = fbServices;
    const unsubCat = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCh = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'channels'), (s) => setSavedChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSet = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'youtube'), (d) => { if (d.exists()) { setApiKey(d.data().key); setIsApiKeySaved(true); }});
    return () => { unsubCat(); unsubCh(); unsubSet(); };
  }, [fbServices, user, hasStarted]);

  const handleSearch = async (type) => {
    if (!apiKey) { alert("API 키를 설정하세요."); return; }
    setIsLoading(true);
    type === 'direct' ? setViewMode('search_channel') : setViewMode('search_video');
    
    try {
      if (type === 'direct') {
          let url = '';
          const q = directQuery.trim();
          if (q.startsWith('@')) {
            url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(q)}&key=${apiKey}`;
          } else if (q.includes('youtube.com/')) {
            const match = q.match(/\/(?:channel\/|@)([\w-]+)/);
            if (match) {
              url = q.includes('/channel/') 
                ? `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${match[1]}&key=${apiKey}`
                : `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=@${match[1]}&key=${apiKey}`;
            }
          }
          
          if (url) {
            const res = await fetch(url); const data = await res.json();
            if (data.items?.length) {
              setChannelResults(data.items.map(c => {
                const views = parseInt(c.statistics.viewCount || 0);
                const videos = parseInt(c.statistics.videoCount || 1);
                const ageDays = Math.max((Date.now() - new Date(c.snippet.publishedAt).getTime()) / 86400000, 1);
                return {
                    channelId: c.id, name: c.snippet.title, thumbnail: c.snippet.thumbnails.medium?.url,
                    subs: parseInt(c.statistics.subscriberCount || 0), views, 
                    uploadRate: videos / ageDays,
                    publishTime: c.snippet.publishedAt,
                    date: new Date(c.snippet.publishedAt).toLocaleDateString(), type: 'channel'
                };
              }));
              setIsLoading(false); return;
            }
          }

          const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=10&q=${encodeURIComponent(q)}&key=${apiKey}`);
          const sData = await sRes.json();
          const cIds = sData.items?.map(i => i.id.channelId).join(',');
          if (cIds) {
            const dRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${cIds}&key=${apiKey}`);
            const dData = await dRes.json();
            setChannelResults(dData.items?.map(c => {
              const views = parseInt(c.statistics.viewCount || 0);
              const videos = parseInt(c.statistics.videoCount || 1);
              const ageDays = Math.max((Date.now() - new Date(c.snippet.publishedAt).getTime()) / 86400000, 1);
              return {
                channelId: c.id, name: c.snippet.title, thumbnail: c.snippet.thumbnails.medium?.url,
                subs: parseInt(c.statistics.subscriberCount || 0), views, 
                uploadRate: videos / ageDays,
                publishTime: c.snippet.publishedAt,
                date: new Date(c.snippet.publishedAt).toLocaleDateString(), type: 'channel'
              };
            }) || []);
          }
      } else {
        const [reg, lng] = keywordFilter.region.split('|');
        const pubAfter = keywordFilter.period === 'custom' 
          ? new Date(parseInt(keywordFilter.customYear), parseInt(keywordFilter.customMonth) - 1, parseInt(keywordFilter.customDay) || 1).toISOString()
          : new Date(Date.now() - parseInt(keywordFilter.period) * 86400000).toISOString();

        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${keywordFilter.maxResults}&q=${encodeURIComponent(keywordFilter.keyword)}&key=${apiKey}&order=${keywordFilter.order}&publishedAfter=${pubAfter}`;
        
        if (reg) url += `&regionCode=${reg}`;
        if (lng) url += `&relevanceLanguage=${lng}`;
        if (keywordFilter.duration !== 'any') url += `&videoDuration=${keywordFilter.duration}`;

        const res = await fetch(url);
        const data = await res.json();
        const items = data.items || [];
        const vIds = items.map(i => i.id.videoId).join(',');
        
        if (vIds) {
          const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${vIds}&key=${apiKey}`);
          const vData = await vRes.json();
          const vMap = {}; vData.items?.forEach(v => vMap[v.id] = v);
          
          const cIds = [...new Set(items.map(i => i.snippet.channelId))].join(',');
          const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${cIds}&key=${apiKey}`);
          const cData = await cRes.json();
          const cMap = {}; cData.items?.forEach(c => cMap[c.id] = c);

          let final = items.map(i => {
            const vF = vMap[i.id.videoId] || { statistics: {} };
            const chF = cMap[i.snippet.channelId] || { statistics: {} };
            const views = parseInt(vF.statistics.viewCount || 0);
            const subs = parseInt(chF.statistics.subscriberCount || 1);
            const videos = parseInt(chF.statistics.videoCount || 1);
            const ageDays = Math.max((Date.now() - new Date(chF.snippet.publishedAt || 0).getTime()) / 86400000, 1);
            return {
              videoId: i.id.videoId, channelId: i.snippet.channelId,
              title: i.snippet.title, thumbnail: i.snippet.thumbnails.medium?.url,
              views, subs, efficiency: views / Math.max(subs, 1), 
              uploadRate: videos / ageDays,
              publishTime: i.snippet.publishedAt,
              type: 'video', date: new Date(i.snippet.publishedAt).toLocaleDateString()
            };
          });

          if (keywordFilter.minViews) final = final.filter(r => r.views >= parseInt(keywordFilter.minViews));
          if (keywordFilter.maxViews) final = final.filter(r => r.views <= parseInt(keywordFilter.maxViews));
          if (keywordFilter.minSubs) final = final.filter(r => r.subs >= parseInt(keywordFilter.minSubs));
          if (keywordFilter.maxSubs) final = final.filter(r => r.subs <= parseInt(keywordFilter.maxSubs));

          setVideoResults(final);
        }
      }
    } catch(e) { console.error("Search Error:", e); } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    if (fbServices && fbServices !== "ERROR") {
      try { await signOut(fbServices.auth); localStorage.removeItem('app-started'); window.location.reload(); } catch (e) { console.error(e); }
    }
  };

  // --- 정렬 로직 (최신순, 빈도순 추가) ---
  const sortedVideos = useMemo(() => {
    return [...videoResults].sort((a, b) => {
        if (sortKey === 'latest') return new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime();
        if (sortKey === 'frequency') return (b.uploadRate || 0) - (a.uploadRate || 0);
        return (b[sortKey] || 0) - (a[sortKey] || 0);
    });
  }, [videoResults, sortKey]);

  const sortedChannels = useMemo(() => {
    return [...channelResults].sort((a, b) => {
        if (sortKey === 'latest') return new Date(b.publishTime).getTime() - new Date(a.publishTime).getTime();
        if (sortKey === 'frequency') return (b.uploadRate || 0) - (a.uploadRate || 0);
        return (b[sortKey] || 0) - (a[sortKey] || 0);
    });
  }, [channelResults, sortKey]);

  const filteredSaved = useMemo(() => savedChannels.filter(ch => activeTab === '전체' || ch.category === activeTab), [savedChannels, activeTab]);

  if (isAuthLoading) return <div className="h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white font-bold font-sans font-bold font-bold font-bold font-bold font-sans font-bold font-bold"><RefreshCw size={48} className="text-blue-600 animate-spin mb-4 font-bold font-bold" /><p className="font-bold font-sans font-bold font-sans font-bold">시스템 초기화 중...</p></div>;

  if (!fbConfig || !hasStarted || !user) {
    return (
      <div className="h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-6 text-center font-sans font-bold">
        <div className="max-w-2xl w-full space-y-8 bg-[#1e1e1e] p-10 md:p-14 rounded-[3rem] border border-gray-800 shadow-2xl no-scrollbar overflow-y-auto max-h-full font-bold">
          {!fbConfig ? (
            <div className="space-y-8 w-full font-bold">
              <Database size={48} className="text-blue-600 mx-auto animate-pulse font-bold" />
              <h1 className="text-4xl font-bold italic uppercase font-sans font-bold">Server Connect</h1>
              <textarea value={configInput} onChange={(e) => setConfigInput(e.target.value)} placeholder={'Firebase Config JSON을 붙여넣으세요.'} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-2xl p-5 text-[11px] h-40 outline-none focus:border-blue-600 font-mono text-blue-100 font-bold font-sans" />
              <button onClick={() => {
                try {
                  const match = configInput.match(/\{[\s\S]*\}/);
                  const parsed = JSON.parse(match[0].replace(/([a-zA-Z0-9_]+):/g, '"$1":').replace(/'/g, '"'));
                  localStorage.setItem('user-fb-config', JSON.stringify(parsed));
                  setFbConfig(parsed);
                } catch(e) { alert("연결 정보 형식이 올바르지 않습니다."); }
              }} className="w-full bg-blue-600 py-5 rounded-[1.5rem] font-bold active:scale-95 transition font-bold font-sans">연결하기</button>
            </div>
          ) : (
            <div className="space-y-10 w-full font-bold font-sans font-bold">
              <CheckCircle size={48} className="text-green-500 mx-auto font-bold font-bold" />
              <h1 className="text-4xl uppercase tracking-tighter italic font-sans font-bold">Connected</h1>
              <button onClick={() => {
                const provider = new GoogleAuthProvider();
                signInWithPopup(fbServices.auth, provider);
              }} className="w-full bg-white text-black py-7 rounded-[1.8rem] text-xl font-bold flex items-center justify-center gap-3 active:scale-95 transition font-bold font-sans font-bold"><LogIn size={26} className="text-blue-600 font-bold" /> Google 로그인</button>
              <button onClick={() => signInAnonymously(fbServices.auth)} className="w-full border border-gray-700 text-gray-400 py-5 rounded-[1.5rem] font-bold hover:text-white transition font-bold font-sans">게스트 시작</button>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-xs text-gray-600 underline font-bold font-sans font-bold font-bold">설정 초기화</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f0f0f] text-white flex flex-col md:flex-row tracking-tight font-sans overflow-hidden font-bold">
      <aside className="w-full md:w-80 h-full border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar bg-[#0f0f0f] z-10 font-bold font-sans font-bold">
        <div className="flex items-center justify-between mb-2 font-bold font-bold font-bold font-bold font-bold">
          <div className="flex items-center gap-2 font-bold font-sans font-bold font-bold font-bold font-bold"><Youtube className="text-red-600 font-bold" size={32} /><h1 className="text-xl italic font-sans font-bold font-bold font-bold">YT Finder</h1></div>
          <button onClick={handleLogout} className="p-2 bg-gray-800 rounded-xl hover:bg-red-600 transition font-bold font-sans font-bold font-bold font-bold" title="Logout"><LogOut size={16} className="font-bold" /></button>
        </div>
        
        <div className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800 flex items-center justify-between shadow-sm font-bold font-bold font-bold font-bold">
          <div className="flex items-center gap-3 min-w-0 font-bold font-sans text-left font-bold font-bold font-bold">
            <div className={`w-8 h-8 rounded-full ${user?.photoURL ? '' : 'bg-blue-600'} flex items-center justify-center overflow-hidden border border-blue-400 shrink-0 font-bold font-bold`}>
              {user?.photoURL ? <img src={user.photoURL} alt="" /> : <User size={16} />}
            </div>
            <div className="min-w-0 font-bold font-bold font-bold font-bold font-bold font-bold">
              <p className="text-xs truncate font-bold font-bold font-sans font-bold font-bold">{user?.displayName || "Guest User"}</p>
              <p className="text-[9px] text-gray-500 uppercase truncate font-bold font-sans font-bold font-bold font-bold">{user?.isAnonymous ? "Local Only" : "Sync Active"}</p>
            </div>
          </div>
        </div>

        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800 text-left font-bold font-sans font-bold font-bold font-bold font-bold">
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-3 uppercase tracking-widest font-bold font-sans font-bold font-bold font-bold font-bold"><Settings size={14} className="font-bold" /> YouTube API</h2>
          {!isApiKeySaved ? (
            <div className="space-y-2 font-bold font-bold font-bold font-bold">
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API Key" className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none font-bold font-sans font-bold font-bold font-bold font-bold" />
              <button onClick={() => { setDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'settings', 'youtube'), { key: apiKey }); setIsApiKeySaved(true); }} className="w-full bg-green-600 py-2 rounded-xl text-xs font-bold active:scale-95 transition font-bold font-sans font-bold font-bold font-bold">키 저장</button>
            </div>
          ) : (
            <div className="flex justify-between items-center text-green-500 font-bold font-bold font-bold font-bold font-bold">
              <span className="text-xs font-bold font-sans font-bold font-bold font-bold font-bold font-bold">API 활성화됨</span>
              <button onClick={() => setIsApiKeySaved(false)} className="text-[10px] text-gray-500 underline font-bold font-sans font-bold font-bold font-bold font-bold font-bold">변경</button>
            </div>
          )}
        </section>

        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800 text-left font-bold font-sans font-bold font-bold font-bold font-bold font-bold">
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-4 uppercase tracking-widest font-bold font-sans font-bold font-bold font-bold font-bold font-bold"><Video size={14} className="font-bold font-bold" /> 필터 검색 (동영상)</h2>
          <div className="space-y-4 font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
            <input value={keywordFilter.keyword} onChange={(e) => setKeywordFilter({...keywordFilter, keyword: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSearch('keyword')} placeholder="검색 키워드" className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none font-bold font-bold font-bold font-sans font-bold font-bold" />
            <div className="space-y-1 font-bold">
              <label className="text-[10px] text-gray-500 font-bold flex items-center gap-1 font-bold font-bold font-bold font-bold"><Globe size={10}/> 국가/언어 선택</label>
              <select value={keywordFilter.region} onChange={(e) => setKeywordFilter({...keywordFilter, region: e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none cursor-pointer font-bold font-bold font-sans font-bold font-bold">
                <option value="KR|ko">🇰🇷 대한민국 (한국어)</option>
                <option value="US|en">🇺🇸 미국 (영어)</option>
                <option value="JP|ja">🇯🇵 일본 (일본어)</option>
                <option value="GB|en">🇬🇧 영국 (영어)</option>
                <option value="DE|de">🇩🇪 독일 (독일어)</option>
                <option value="|">🌍 글로벌 (전체)</option>
              </select>
            </div>
            <div className="space-y-1 font-bold font-bold font-bold font-bold font-bold font-bold">
              <label className="text-[10px] text-gray-500 font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-bold">기간 설정</label>
              <select value={keywordFilter.period} onChange={(e) => setKeywordFilter({...keywordFilter, period: e.target.value})} className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none cursor-pointer font-bold font-bold font-bold font-sans font-bold">
                <option value="7">최근 7일</option>
                <option value="14">최근 14일</option>
                <option value="30">최근 30일</option>
                <option value="365">최근 1년</option>
                <option value="custom">직접 지정</option>
              </select>
            </div>

            {keywordFilter.period === 'custom' && (
              <div className="grid grid-cols-3 gap-1 animate-in slide-in-from-top-1 font-bold font-bold font-bold font-bold font-bold font-bold">
                  <select value={keywordFilter.customYear} onChange={(e)=>setKeywordFilter({...keywordFilter, customYear: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg font-bold font-sans font-bold font-bold">
                      {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                  <select value={keywordFilter.customMonth} onChange={(e)=>setKeywordFilter({...keywordFilter, customMonth: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg font-bold font-sans font-bold font-bold">
                      {Array.from({length:12}, (_,i)=>(i+1).toString().padStart(2,'0')).map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                  <input value={keywordFilter.customDay} onChange={(e)=>setKeywordFilter({...keywordFilter, customDay: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg font-bold font-sans font-bold font-bold" placeholder="1일"/>
              </div>
            )}

            <button onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="text-[11px] text-gray-500 flex items-center gap-1 hover:text-white transition py-1 font-bold font-bold font-bold font-bold font-sans font-bold font-bold">
              {isAdvancedOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {isAdvancedOpen ? "고급 옵션 닫기" : "고급 수치 필터 (조회수/구독자)"}
            </button>
            
            {isAdvancedOpen && (
              <div className="space-y-3 p-3 bg-black/30 rounded-xl border border-white/5 animate-in fade-in font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
                  <div className="grid grid-cols-2 gap-2 text-left font-bold font-bold font-bold font-sans font-bold font-bold">
                      <div className="space-y-1 font-bold font-bold font-bold"><p className="text-[9px] text-gray-500 uppercase font-bold font-bold font-bold">최소 조회수</p><input value={keywordFilter.minViews} onChange={(e)=>setKeywordFilter({...keywordFilter, minViews: e.target.value})} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-bold font-sans font-bold font-bold" placeholder="0"/></div>
                      <div className="space-y-1 font-bold font-bold font-bold"><p className="text-[9px] text-gray-500 uppercase font-bold font-bold font-bold">최대 조회수</p><input value={keywordFilter.maxViews} onChange={(e)=>setKeywordFilter({...keywordFilter, maxViews: e.target.value})} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-bold font-sans font-bold font-bold" placeholder="Max"/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left font-bold font-bold font-bold font-sans font-bold font-bold">
                      <div className="space-y-1 font-bold font-bold font-bold font-bold"><p className="text-[9px] text-gray-500 uppercase font-bold font-bold font-bold font-bold">최소 구독자</p><input value={keywordFilter.minSubs} onChange={(e)=>setKeywordFilter({...keywordFilter, minSubs: e.target.value})} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-bold font-sans font-bold font-bold" placeholder="0"/></div>
                      <div className="space-y-1 font-bold font-bold font-bold font-bold"><p className="text-[9px] text-gray-500 uppercase font-bold font-bold font-bold font-bold">최대 구독자</p><input value={keywordFilter.maxSubs} onChange={(e)=>setKeywordFilter({...keywordFilter, maxSubs: e.target.value})} className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-bold font-sans font-bold font-bold" placeholder="Max"/></div>
                  </div>
                  <div className="space-y-1 text-left font-bold font-bold font-bold font-sans font-bold font-bold font-bold"><p className="text-[9px] text-gray-500 uppercase font-bold font-sans font-bold font-bold font-bold">결과 개수</p><select value={keywordFilter.maxResults} onChange={(e)=>setKeywordFilter({...keywordFilter, maxResults: e.target.value})} className="bg-black border border-gray-800 w-full p-2 rounded-lg text-xs font-bold font-sans font-bold font-bold"><option value="10">10개</option><option value="25">25개</option><option value="50">50개</option></select></div>
              </div>
            )}

            <button onClick={() => handleSearch('keyword')} disabled={isLoading} className="w-full bg-blue-600 py-3 rounded-xl text-xs font-bold uppercase transition hover:bg-blue-700 active:scale-95 font-bold font-bold font-bold font-bold font-sans font-bold font-bold font-bold">동영상 검색</button>
          </div>
        </section>

        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800 text-left font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-4 uppercase tracking-widest font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold"><Users size={14} className="font-bold font-bold font-bold font-bold" /> 채널 직통 검색</h2>
          <div className="space-y-3 font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
            <input value={directQuery} onChange={(e) => setDirectQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch('direct')} placeholder="채널명, @핸들, URL" className="w-full bg-black border border-gray-800 rounded-xl p-2 text-xs outline-none font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-bold" />
            <button onClick={() => handleSearch('direct')} disabled={isLoading} className="w-full bg-red-600 py-2.5 rounded-xl text-[11px] font-bold uppercase active:scale-95 transition font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold">채널 검색</button>
          </div>
        </section>
        
        <button onClick={() => setIsGuideOpen(true)} className="mt-auto text-[10px] text-gray-500 flex items-center justify-center gap-1 hover:text-white transition font-bold font-sans underline underline-offset-2 font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">설정 가이드 보기</button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#0f0f0f] font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
        <header className="p-8 pb-4 text-center shrink-0 font-bold font-bold font-bold font-bold font-bold font-bold">
          <h1 className="text-4xl font-black italic uppercase text-white drop-shadow-lg font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">유튜브 채널 탐색기</h1>
        </header>

        <nav className="px-8 mt-6 text-left shrink-0 font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
          <div className="flex gap-4 border-b border-gray-800 uppercase text-xs tracking-widest font-bold font-bold font-bold font-bold font-bold font-bold">
            <button onClick={() => setViewMode('search_video')} className={`pb-3 px-4 flex items-center gap-2 transition font-bold font-bold ${viewMode === 'search_video' ? 'text-blue-500 border-b-2 border-blue-500 font-bold font-bold' : 'text-gray-500 hover:text-white font-bold font-sans font-bold font-bold font-bold'}`}>필터검색 <span className="bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded-full text-[9px] font-sans font-bold font-bold font-bold font-bold">{videoResults.length}</span></button>
            <button onClick={() => setViewMode('search_channel')} className={`pb-3 px-4 flex items-center gap-2 transition font-bold font-bold ${viewMode === 'search_channel' ? 'text-red-500 border-b-2 border-red-500 font-bold font-bold font-bold' : 'text-gray-500 hover:text-white font-bold font-sans font-bold font-bold font-bold'}`}>채널검색 <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full text-[9px] font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">{channelResults.length}</span></button>
            <button onClick={() => setViewMode('saved')} className={`pb-3 px-4 flex items-center gap-2 transition font-bold font-bold ${viewMode === 'saved' ? 'text-green-500 border-b-2 border-green-500 font-bold font-bold font-bold' : 'text-gray-500 hover:text-white font-bold font-sans font-bold font-bold font-bold'}`}>저장목록 <span className="bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full text-[9px] font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">{savedChannels.length}</span></button>
          </div>
        </nav>
        
        <div className="px-8 mt-4 flex items-center justify-between shrink-0 font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
          {viewMode === 'saved' ? (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
              <button onClick={() => setActiveTab('전체')} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition border ${activeTab === '전체' ? 'bg-white text-black border-white shadow-lg font-bold font-sans font-bold font-bold font-bold' : 'border-gray-800 text-gray-400 hover:text-white font-bold font-sans font-bold font-bold font-bold'}`}>전체</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setActiveTab(cat.name)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition border flex items-center gap-2 ${activeTab === cat.name ? 'bg-orange-600 text-white border-orange-600 shadow-lg font-bold font-sans font-bold font-bold font-bold' : 'border-gray-800 text-gray-400 hover:text-white font-bold font-sans font-bold font-bold font-bold'}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 font-bold font-bold"></div>{cat.name}
                </button>
              ))}
              <button onClick={() => setIsModalOpen(true)} className="p-1.5 text-gray-500 hover:text-white font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold"><FolderEdit size={16} className="font-bold font-bold font-bold font-bold" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
              <span className="text-[10px] text-gray-500 uppercase mr-2 font-bold font-bold font-bold font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">Sort by:</span>
              {[
                { label: "조회수 순", key: "views" }, 
                { label: "효율 순", key: "efficiency" }, 
                { label: "구독자 순", key: "subs" },
                { label: "최신 순", key: "latest" },
                { label: "빈도 순", key: "frequency" }
              ].map(s => (
                <button key={s.key} onClick={() => setSortKey(s.key)} className={`px-4 py-1.5 rounded-full text-[11px] border transition font-bold font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold ${sortKey === s.key ? 'bg-white text-black border-white shadow-lg font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold' : 'border-gray-800 text-gray-400 hover:text-white font-bold font-bold font-bold font-bold font-bold'}`}>{s.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-8 flex-1 overflow-y-auto no-scrollbar font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
              <Loader2 size={48} className="animate-spin text-red-600 mb-4 opacity-50 font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold" />
              <p className="font-bold uppercase tracking-widest font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">데이터 분석 중...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 font-bold font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
              {viewMode === 'search_video' && (
                sortedVideos.length > 0 ? sortedVideos.map(res => <ChannelCard key={res.videoId} result={res} onSave={(r, c, t) => addDoc(collection(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels'), { ...r, category: c, type: t, timestamp: Date.now() })} onAnalyze={setAnalysisChannel} isSavedView={false} categories={categories} mode="video" onUpdateCategory={()=>{}} onUpdateMemo={()=>{}} />) : (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-3xl font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
                    동영상 키워드 검색 결과가 여기에 표시됩니다.
                  </div>
                )
              )}
              {viewMode === 'search_channel' && (
                sortedChannels.length > 0 ? sortedChannels.map(res => <ChannelCard key={res.channelId} result={res} onSave={(r, c, t) => addDoc(collection(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels'), { ...r, category: c, type: t, timestamp: Date.now() })} onAnalyze={setAnalysisChannel} isSavedView={false} categories={categories} mode="channel" onUpdateCategory={()=>{}} onUpdateMemo={()=>{}} />) : (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-3xl font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
                    직통 검색된 채널 목록이 여기에 표시됩니다.
                  </div>
                )
              )}
              {viewMode === 'saved' && (
                filteredSaved.length > 0 ? filteredSaved.map(ch => <ChannelCard key={ch.id} result={ch} onRemove={(id) => deleteDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id))} onUpdateCategory={(id, c) => updateDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id), { category: c })} onUpdateMemo={(id, m) => updateDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id), { memo: m })} onAnalyze={setAnalysisChannel} isSavedView={true} categories={categories} mode={ch.type} />) : (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-700 italic border border-dashed border-gray-800 rounded-3xl font-sans font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold font-bold">
                    저장된 채널이 없습니다.
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>

      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categories={categories} onAdd={(n) => addDoc(collection(fbServices.db, 'artifacts', appId, 'users', user.uid, 'categories'), { name: n.trim() })} onDelete={(id) => deleteDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'categories', id))} />
      <AnalysisModal isOpen={!!analysisChannel} onClose={() => setAnalysisChannel(null)} channel={analysisChannel} apiKey={apiKey} />
      <SetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}