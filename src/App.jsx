import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Search, Plus, Trash2, ExternalLink, X, Save, FolderEdit, Youtube,
  Calendar, BookmarkPlus, ListVideo, Users, PlaySquare, Loader2, Edit3, Check, 
  Database, Info, AlertCircle, RefreshCw, ArrowRight, Zap, LogIn, LogOut, User, 
  CheckCircle, CheckCircle2, Video, BarChart3, TrendingUp, SortAsc, Clock, 
  Activity, ThumbsUp, ChevronDown, ChevronUp, Tag, Languages, Radio
} from 'lucide-react';

import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut, signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc
} from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : "yt-finder-v1"; 

// --- 유틸리티 및 데이터 ---
const VIDEO_CATEGORIES = {
    "1": "영화/애니메이션", "2": "자동차", "10": "음악", "15": "애완동물/동물", "17": "스포츠",
    "18": "단편영화", "19": "여행/이벤트", "20": "게임", "21": "일상/브이로그", "22": "인물/블로그",
    "23": "코미디", "24": "엔터테인먼트", "25": "뉴스/정치", "26": "노하우/스타일", "27": "교육",
    "28": "과학기술", "29": "비영리/사회운동"
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

const formatNumber = (n) => {
  const num = parseInt(n || 0);
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "억";
  if (num >= 10000) return (num / 10000).toFixed(1) + "만";
  if (num >= 1000) return (num / 1000).toFixed(1) + "천";
  return num.toString();
};

// --- 서브 컴포넌트 ---

const SetupGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 text-white">
      <div className="bg-[#1a1a1a] w-full max-w-2xl border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313]">
          <h2 className="text-xl flex items-center gap-2 font-bold"><Zap className="text-yellow-400" size={24} /> 상세 설정 가이드</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2"><X size={24} /></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-8 text-sm">
          <section><h3 className="text-lg mb-2 font-bold">1. Firebase 연동</h3><p className="text-gray-400 font-medium">콘솔에서 생성한 웹 앱의 firebaseConfig 객체를 입력창에 붙여넣으세요.</p></section>
          <section><h3 className="text-lg mb-2 font-bold">2. 도메인 승인</h3><p className="text-gray-400 font-medium mb-2">현재 주소를 [승인된 도메인]에 등록해야 로그인이 가능합니다.</p></section>
          <section><h3 className="text-lg mb-2 font-bold">3. Firestore 규칙</h3><pre className="bg-black/50 p-3 rounded-lg text-blue-300 font-mono text-[10px] overflow-x-auto select-all">{"rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /artifacts/" + appId + "/users/{userId}/{allPaths=**} {\n      allow read, write: if request.auth != null;\n    }\n  }\n}"}</pre></section>
        </div>
        <div className="p-6 bg-black/40 border-t border-gray-800"><button onClick={onClose} className="w-full bg-blue-600 py-4 rounded-2xl font-bold shadow-xl transition active:scale-95">확인했습니다</button></div>
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
    <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] w-full max-w-3xl border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {!loading && stats?.banner && (
            <div className="w-full h-32 md:h-40 overflow-hidden relative shrink-0">
                <img src={stats.banner} className="w-full h-full object-cover opacity-60" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent"></div>
            </div>
        )}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313] shrink-0 relative z-10">
          <div className="flex items-center gap-4 min-w-0 text-left">
            <div className={`w-16 h-16 rounded-full overflow-hidden border-2 border-red-600/50 bg-gray-800 shrink-0 ${stats?.banner ? '-mt-12 shadow-xl' : ''}`}>
              <img src={channel?.thumbnail || channel?.thumb} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{channel?.name || channel?.title || channel?.channelTitle}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Channel Insight</p>
                {stats?.isLive && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-1 font-bold"><Radio size={10}/> LIVE</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 bg-white/5 rounded-full border border-white/5"><X size={28} /></button>
        </div>
        <div className="p-8 overflow-y-auto space-y-10 flex-1 text-white">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 font-semibold">
              <Loader2 className="animate-spin mb-4" size={48} /><p className="uppercase tracking-widest text-xs">Analyzing Data...</p>
            </div>
          ) : stats ? (
            <>
              {stats.keywords.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><Tag size={14} /> 주요 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.keywords.slice(0, 8).map((kw, i) => (
                      <span key={i} className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[11px] text-gray-400">#{kw.replace(/[",]/g, '')}</span>
                    ))}
                  </div>
                </section>
              )}
              <section className="space-y-4 text-left">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={16} className="text-red-500" /> 업로드 요약</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { val: stats.totalUploads, label: "30일 업로드", color: "text-red-600" },
                        { val: stats.totalUploads > 0 ? `${(30/stats.totalUploads).toFixed(1)}일` : "-", label: "빈도", color: "text-red-500" },
                        { val: stats.uploadDays, label: "업로드 날수", color: "text-red-600" },
                        { val: formatNumber(stats.maxViews), label: "최다 조회수", color: "text-red-500" }
                    ].map((card, i) => (
                        <div key={i} className="bg-[#111] border border-gray-800 p-4 rounded-xl text-center shadow-inner">
                            <p className={`text-xl font-bold ${card.color} leading-tight`}>{card.val}</p>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">{card.label}</p>
                        </div>
                    ))}
                </div>
              </section>
              <section className="space-y-4 text-left">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16} className="text-green-500" /> 조회수 분석</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-orange-600/5 border border-orange-600/20 p-5 rounded-2xl text-center">
                    <p className="text-3xl font-bold text-orange-500">{formatNumber(stats.avgRecentViews)}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">최근 30일 평균</p>
                  </div>
                  <div className="bg-blue-600/5 border border-blue-600/20 p-5 rounded-2xl text-center">
                    <p className="text-3xl font-bold text-blue-500">{formatNumber(stats.avgAllTimeViews)}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase">역대 일평균</p>
                  </div>
                </div>
              </section>
              <div className="space-y-4 text-left">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={16} /> 활동 달력</h3>
                <div className="grid grid-cols-7 gap-2 bg-black/30 p-4 rounded-2xl border border-white/5 text-center">
                  {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                    <div key={d} className="text-[9px] text-gray-600 font-bold mb-1">{d}</div>
                  ))}
                  {Object.entries(stats.dateMap).reverse().map(([date, count]) => (
                    <div key={date} className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition ${count > 0 ? 'bg-red-600/20 border-red-600/40 text-red-500 shadow-lg' : 'bg-white/5 border-transparent text-gray-700'}`}>
                      <span className="text-[9px] opacity-40">{date.split('-')[2]}</span>
                      {count > 0 && <span className="text-xs font-bold">{count}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4 text-left">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><ListVideo size={16} /> 최근 업로드 상세</h3>
                <div className="grid grid-cols-1 gap-3">
                  {stats.recentVideos.map(vid => {
                     const vV = parseInt(vid.statistics?.viewCount || 0);
                     const sC = parseInt(stats.subCount) || 1;
                     return (
                        <a key={vid.id} href={`https://www.youtube.com/watch?v=${vid.id}`} target="_blank" rel="noreferrer" className="flex gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 group transition">
                            <div className="w-28 aspect-video rounded overflow-hidden shrink-0 bg-gray-900 relative">
                                <img src={vid.snippet.thumbnails.medium?.url} className="w-full h-full object-cover" alt="" />
                                <div className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1.5 py-0.5 rounded font-bold text-white">{parseISO8601Duration(vid.contentDetails?.duration)}</div>
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                                <p className="text-[13px] text-white font-semibold whitespace-normal line-clamp-2 leading-snug group-hover:text-red-400 transition">{vid.snippet.title}</p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-gray-500 font-medium">
                                    <span className="bg-red-600/10 text-red-500 px-1.5 rounded">{VIDEO_CATEGORIES[vid.snippet.categoryId] || "기타"}</span>
                                    <span className="flex items-center gap-1"><TrendingUp size={12}/> {formatNumber(vV)}</span>
                                    <span className="text-yellow-500 font-bold ml-auto">효율 {(vV/sC).toFixed(1)}배</span>
                                </div>
                            </div>
                        </a>
                     )
                  })}
                </div>
              </div>
            </>
          ) : <div className="text-center py-20 text-gray-500">No data found.</div>}
        </div>
        <div className="p-5 bg-[#131313] border-t border-gray-800 shrink-0">
          <button onClick={onClose} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl transition active:scale-95 shadow-lg">닫기</button>
        </div>
      </div>
    </div>
  );
};

const CategoryModal = ({ isOpen, onClose, categories, onAdd, onDelete }) => {
  const [newCat, setNewCat] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1e1e1e] w-full max-w-md border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#131313] text-white">
          <h2 className="text-xl flex items-center gap-2 font-bold"><FolderEdit size={20} className="text-red-500" /> 카테고리 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="새 카테고리 명" className="flex-1 bg-[#2c2c2c] border border-gray-700 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-red-600 transition" onKeyDown={(e) => e.key === 'Enter' && (onAdd(newCat), setNewCat(''))} />
            <button onClick={() => { onAdd(newCat); setNewCat(''); }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold">추가</button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2 text-white">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-4 bg-[#2c2c2c] rounded-xl group text-left">
                <span className="font-semibold">{cat.name}</span>
                <button onClick={() => onDelete(cat.id)} className="text-gray-500 hover:text-red-500 transition opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
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
    <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all flex flex-col h-full text-white shadow-lg">
      <div className="flex gap-4 mb-4">
        <div onClick={() => onAnalyze(result)} className={`shrink-0 overflow-hidden shadow-inner flex items-center justify-center bg-gray-800 cursor-pointer hover:ring-2 hover:ring-red-500 transition ${isVideo ? 'w-24 h-14 rounded-lg' : 'w-16 h-16 rounded-full'}`}>
          {result.thumbnail || result.thumb ? <img src={result.thumbnail || result.thumb} alt="" className="w-full h-full object-cover" /> : <Youtube size={24} />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-[13px] text-white font-bold whitespace-normal line-clamp-2 leading-snug mb-1.5 h-10">{result.title || result.name}</h3>
          {isVideo && (<div className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-400 cursor-pointer transition truncate mb-2" onClick={(e) => { e.stopPropagation(); onAnalyze(result); }}><Users size={10} /><span className="truncate">{result.channelTitle}</span></div>)}
          <div className="flex flex-wrap gap-1.5 mt-1">
             <span className="bg-gray-800 text-gray-400 text-[9px] px-2 py-0.5 rounded-full uppercase">{isVideo ? 'Video' : 'Channel'}</span>
             {result.efficiency > 0 && <span className="bg-orange-600/20 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-bold">🔥 효율 {result.efficiency.toFixed(1)}배</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-bold text-left">Views</p>
          <p className="text-xs text-blue-400 font-bold">{formatNumber(result.views || 0)}</p>
        </div>
        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-bold text-left">Subs</p>
          <p className="text-xs text-green-400 font-bold">{formatNumber(result.subs || 0)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 text-left">
        <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={10}/> {result.date}</span>
      </div>
      {isSavedView ? (
        <div className="mb-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <select value={selectedCategory} onChange={(e) => onUpdateCategory(result.id, e.target.value)} className="bg-yellow-600/10 text-yellow-500 text-[10px] px-2 py-0.5 rounded-lg border border-yellow-600/20 outline-none cursor-pointer font-bold">
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {!isEditingMemo ? <button onClick={() => setIsEditingMemo(true)} className="text-gray-500 hover:text-white transition"><Edit3 size={14} /></button> : <button onClick={() => { onUpdateMemo(result.id, tempMemo); setIsEditingMemo(false); }} className="text-green-500 hover:text-green-400 transition"><Check size={16} /></button>}
          </div>
          {isEditingMemo ? <textarea autoFocus value={tempMemo} onChange={(e) => setTempMemo(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 focus:border-red-600 outline-none resize-none h-20 transition" /> : <div className="bg-black/20 rounded-xl p-3 min-h-[40px] border border-white/5 text-left text-[11px] text-gray-400 line-clamp-3">{result.memo || "작성된 메모가 없습니다."}</div>}
        </div>
      ) : (
        <div className="mb-4 text-left font-bold">
          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest">저장 위치</p>
          <select className="w-full bg-gray-800 text-gray-300 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none cursor-pointer" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.length > 0 ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option value="">카테고리 없음</option>}
          </select>
        </div>
      )}
      <div className="flex gap-2 mt-auto">
        {!isSavedView ? <button onClick={() => onSave(result, selectedCategory, mode)} className="flex-1 bg-white text-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 font-bold shadow-md">저장하기</button> : (
          <button onClick={() => onRemove(result.id)} className="flex-1 bg-red-600/20 text-red-500 text-xs py-2.5 rounded-xl border border-red-600/30 hover:bg-red-600 hover:text-white transition font-bold">삭제</button>
        )}
        <button onClick={() => onAnalyze(result)} className="p-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition shrink-0 flex items-center justify-center" title="상세분석"><BarChart3 size={16} /></button>
      </div>
    </div>
  );
};

// --- 메인 앱 ---

export default function App() {
  const [fbConfig, setFbConfig] = useState(() => { try { const s = localStorage.getItem('user-fb-config'); return s ? JSON.parse(s) : null; } catch(e) { return null; }});
  const [configInput, setConfigInput] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [hasStarted, setHasStarted] = useState(() => !!localStorage.getItem('app-started'));
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false); 
  const [analysisChannel, setAnalysisChannel] = useState(null);
  const [viewMode, setViewMode] = useState('search_video'); 
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('전체');
  const [isLoading, setIsLoading] = useState(false);
  const [videoResults, setVideoResults] = useState([]);
  const [channelResults, setChannelResults] = useState([]);
  const [savedChannels, setSavedChannels] = useState([]);
  const [sortKey, setSortKey] = useState('views');
  const [directQuery, setDirectQuery] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  
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

  const handleLogout = async () => {
    if (fbServices && fbServices !== "ERROR") {
      try { await signOut(fbServices.auth); setHasStarted(false); localStorage.removeItem('app-started'); window.location.reload(); } catch (e) { console.error(e); }
    }
  };

  const handleSave = async (res, cat, type) => {
    if (!fbServices || !user || !cat) { alert("카테고리를 선택하세요!"); return; }
    if (savedChannels.some(c => type === 'video' ? c.videoId === res.videoId : c.channelId === res.channelId)) { alert("이미 존재합니다."); return; }
    try { await addDoc(collection(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels'), { ...res, category: cat, type, memo: '', timestamp: Date.now() }); setViewMode('saved'); } catch(e) { alert("저장 실패"); }
  };

  const handleSaveApiKey = () => {
    if (!apiKey.trim() || !user) return;
    setSaveStatus('saving');
    setDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'settings', 'youtube'), { key: apiKey.trim() })
      .then(() => { setIsApiKeySaved(true); setIsEditingApiKey(false); setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 2000); });
  };

  useEffect(() => {
    if (!fbServices || fbServices === "ERROR") { setIsAuthLoading(false); return; }
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(fbServices.auth, __initial_auth_token);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(fbServices.auth, (u) => {
      setUser(u); if (u) { setHasStarted(true); localStorage.setItem('app-started', 'true'); }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [fbServices]);

  useEffect(() => {
    if (!fbServices || fbServices === "ERROR" || !user || !hasStarted) return;
    const { db } = fbServices;
    const unsubCat = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'categories'), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubCh = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'channels'), (s) => setSavedChannels(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubSet = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'youtube'), (d) => { if (d.exists()) { const k = d.data().key; if (k) { setApiKey(k); setIsApiKeySaved(true); setIsEditingApiKey(false); }}});
    return () => { unsubCat(); unsubCh(); unsubSet(); };
  }, [fbServices, user, hasStarted]);

  const filteredSaved = useMemo(() => savedChannels.filter(ch => activeTab === '전체' || ch.category === activeTab), [savedChannels, activeTab]);
  const sortedVideos = useMemo(() => [...videoResults].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0)), [videoResults, sortKey]);
  const sortedChannels = useMemo(() => [...channelResults].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0)), [channelResults, sortKey]);

  const handleSearch = async (type) => {
    const q = type === 'direct' ? directQuery.trim() : keywordFilter.keyword.trim();
    if (!q || !isApiKeySaved) return;
    setIsLoading(true); setErrorCode(null);
    type === 'keyword' ? setViewMode('search_video') : setViewMode('search_channel');
    try {
      if (type === 'direct') {
          let url = '';
          if (q.startsWith('@')) url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&forHandle=${encodeURIComponent(q)}&key=${apiKey}`;
          else if (q.includes('youtube.com/')) {
              const match = q.match(/\/(?:channel\/|@)([\w-]+)/);
              if (match) url = q.includes('/channel/') ? `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${match[1]}&key=${apiKey}` : `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&forHandle=@${match[1]}&key=${apiKey}`;
          }
          if (url) {
              const res = await fetch(url); const data = await res.json();
              if (data.items?.length) { setChannelResults(data.items.map(c => ({ channelId: c.id, name: c.snippet.title, thumbnail: c.snippet.thumbnails.medium?.url, subs: parseInt(c.statistics.subscriberCount || 0), views: parseInt(c.statistics.viewCount || 0), date: new Date(c.snippet.publishedAt).toLocaleDateString(), publishTime: c.snippet.publishedAt, uploadRate: parseInt(c.statistics.videoCount || 0) / Math.max((Date.now() - new Date(c.snippet.publishedAt).getTime()) / 86400000, 1), type: 'channel' }))); setIsLoading(false); return; }
          }
          const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=10&q=${encodeURIComponent(q)}&key=${apiKey}`);
          const sData = await sRes.json(); const cIds = sData.items?.map(i => i.id.channelId).join(',');
          if (cIds) {
              const dRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${cIds}&key=${apiKey}`);
              const dData = await dRes.json(); setChannelResults(dData.items?.map(c => ({ channelId: c.id, name: c.snippet.title, thumbnail: c.snippet.thumbnails.medium?.url, subs: parseInt(c.statistics.subscriberCount || 0), views: parseInt(c.statistics.viewCount || 0), date: new Date(c.snippet.publishedAt).toLocaleDateString(), publishTime: c.snippet.publishedAt, uploadRate: parseInt(c.statistics.videoCount || 0) / Math.max((Date.now() - new Date(c.snippet.publishedAt).getTime()) / 86400000, 1), type: 'channel' })) || []);
          }
      } else {
        const [reg, lng] = keywordFilter.region.split('|');
        const pubAfter = keywordFilter.period === 'custom' ? new Date(parseInt(keywordFilter.customYear), parseInt(keywordFilter.customMonth) - 1, parseInt(keywordFilter.customDay) || 1).toISOString() : new Date(Date.now() - parseInt(keywordFilter.period) * 86400000).toISOString();
        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${keywordFilter.maxResults}&q=${encodeURIComponent(q)}&key=${apiKey}&order=${keywordFilter.order}&publishedAfter=${pubAfter}`;
        if (keywordFilter.duration !== 'any') url += `&videoDuration=${keywordFilter.duration}`;
        if (reg) url += `&regionCode=${reg}`; if (lng) url += `&relevanceLanguage=${lng}`;
        const res = await fetch(url); const data = await res.json(); const items = data.items || [];
        const vIds = items.map(i => i.id.videoId).join(',');
        const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${vIds}&key=${apiKey}`);
        const vData = await vRes.json(); const vMap = {}; (vData.items || []).forEach(v => vMap[v.id] = v);
        const cIds = [...new Set(items.map(i => i.snippet.channelId))].join(',');
        const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${cIds}&key=${apiKey}`);
        const cData = await cRes.json(); const cMap = {}; (cData.items || []).forEach(c => cMap[c.id] = c);
        let finalResults = items.map(i => {
          const vF = vMap[i.id.videoId] || { statistics: {}, contentDetails: {} };
          const chF = cMap[i.snippet.channelId] || { snippet: {}, statistics: {} };
          const views = parseInt(vF.statistics.viewCount || 0); const subs = parseInt(chF.statistics.subscriberCount || 1);
          return { videoId: i.id.videoId, channelId: i.snippet.channelId, title: i.snippet.title, channelTitle: i.snippet.channelTitle, thumbnail: i.snippet.thumbnails.medium?.url, date: new Date(i.snippet.publishedAt).toLocaleDateString(), publishTime: i.snippet.publishedAt, views, subs, efficiency: views / subs, uploadRate: parseInt(chF.statistics.videoCount || 0) / Math.max((Date.now() - new Date(chF.snippet.publishedAt || 0).getTime()) / 86400000, 1), type: 'video' };
        });
        if (keywordFilter.minViews) finalResults = finalResults.filter(r => r.views >= parseInt(keywordFilter.minViews));
        if (keywordFilter.maxViews) finalResults = finalResults.filter(r => r.views <= parseInt(keywordFilter.maxViews));
        if (keywordFilter.minSubs) finalResults = finalResults.filter(r => r.subs >= parseInt(keywordFilter.minSubs));
        if (keywordFilter.maxSubs) finalResults = finalResults.filter(r => r.subs <= parseInt(keywordFilter.maxSubs));
        setVideoResults(finalResults);
      }
    } catch(err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleSaveConfig = () => {
    try {
      const match = configInput.match(/\{[\s\S]*\}/); if (!match) throw new Error();
      const cleanJson = match[0].replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1').replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":').replace(/:\s*[']([^']*)[']/g, ': "$1"').replace(/,\s*([}\]])/g, '$1').replace(/\s+/g, ' ');
      const parsed = JSON.parse(cleanJson);
      if (parsed.apiKey && (parsed.projectId || parsed.projectid)) { const final = { ...parsed, projectId: parsed.projectId || parsed.projectid }; localStorage.setItem('user-fb-config', JSON.stringify(final)); setFbConfig(final); } else throw new Error();
    } catch (err) { alert("설정 형식이 올바르지 않습니다."); }
  };

  const startLogin = async (type) => {
    try {
      if (type === 'google') { const provider = new GoogleAuthProvider(); await signInWithPopup(fbServices.auth, provider); }
      else { await signInAnonymously(fbServices.auth); }
    } catch (e) {
      if (e.code === 'auth/unauthorized-domain') setErrorCode(103);
      else if (e.code === 'auth/operation-not-allowed') setErrorCode(101);
    }
  };

  if (isAuthLoading) return <div className="h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white font-bold"><RefreshCw size={48} className="text-blue-600 animate-spin mb-4" /><p className="uppercase tracking-widest text-sm text-gray-500">System Initializing...</p></div>;

  if (!fbConfig || !hasStarted || !user) {
    return (
      <div className="h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-6 text-center font-sans">
        <div className="max-w-2xl w-full space-y-8 bg-[#1e1e1e] p-10 md:p-14 rounded-[3rem] border border-gray-800 shadow-2xl animate-in fade-in zoom-in duration-500 overflow-y-auto max-h-full no-scrollbar">
          {!fbConfig ? (
            <div className="space-y-8 w-full">
              <Database size={48} className="text-blue-600 mx-auto animate-pulse" />
              <h1 className="text-4xl font-bold uppercase tracking-tighter italic">Server Connect</h1>
              <div className="space-y-4 text-left w-full">
                <div className="flex justify-between px-1">
                  <label className="text-xs uppercase font-bold text-gray-400"><Info size={14} className="inline mr-1"/> Firebase SDK</label>
                  <button onClick={() => setIsGuideOpen(true)} className="text-[11px] text-blue-500 underline font-bold">설정 가이드</button>
                </div>
                <textarea value={configInput} onChange={(e) => setConfigInput(e.target.value)} placeholder={'const firebaseConfig = { ... };'} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-2xl p-5 text-[11px] h-40 outline-none focus:border-blue-600 font-mono text-blue-100" />
                <button onClick={handleSaveConfig} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-[1.5rem] text-lg shadow-xl flex items-center justify-center gap-3 transition active:scale-95 font-bold">연결하기 <ArrowRight size={20} /></button>
              </div>
            </div>
          ) : (
            <div className="space-y-10 w-full font-bold">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <h1 className="text-4xl uppercase tracking-tighter italic">Connected</h1>
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => startLogin('google')} className="group w-full bg-white hover:bg-gray-100 text-black py-7 rounded-[1.8rem] transition active:scale-95 shadow-2xl flex flex-col items-center justify-center gap-2 border-4 border-blue-600/5">
                   <div className="flex items-center gap-3 text-xl font-bold"><LogIn size={26} className="text-blue-600" /> Google 로그인 시작</div>
                   <p className="text-[11px] text-gray-500 uppercase font-medium">모든 기기에서 내 목록을 불러옵니다</p>
                </button>
                <button onClick={() => startLogin('guest')} className="w-full bg-transparent border border-gray-700 text-gray-400 py-5 rounded-[1.5rem] hover:text-white transition text-sm font-bold">게스트로 시작</button>
              </div>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[11px] text-gray-600 hover:text-red-500 underline">서버 정보 초기화</button>
            </div>
          )}
        </div>
        <SetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f0f0f] text-white flex flex-col md:flex-row tracking-tight font-sans overflow-hidden">
      <aside className="w-full md:w-80 h-full border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto no-scrollbar bg-[#0f0f0f] z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-bold"><Youtube className="text-red-600" size={32} /><h1 className="text-xl italic">YT Finder</h1></div>
          <button onClick={handleLogout} className="p-2 bg-gray-800 rounded-xl hover:bg-red-600 transition" title="Logout"><LogOut size={16} /></button>
        </div>
        
        <div className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 min-w-0 font-bold">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden border border-blue-400 shrink-0">{user?.photoURL ? <img src={user.photoURL} alt="" /> : <User size={16} />}</div>
            <div className="min-w-0 text-left">
              <p className="text-xs truncate">{user?.displayName || "Guest User"}</p>
              <p className="text-[9px] text-gray-500 uppercase truncate font-medium">{user?.isAnonymous ? "Local Only" : "Sync Active"}</p>
            </div>
          </div>
        </div>

        <section className={`bg-[#1e1e1e] rounded-2xl p-4 border ${isApiKeySaved ? 'border-gray-800' : 'border-red-600/50 animate-pulse'} shadow-sm`}>
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-3 uppercase tracking-widest font-bold underline underline-offset-4 decoration-red-600/30"><Settings size={14}/> API Settings</h2>
          {(isApiKeySaved && !isEditingApiKey) ? (
            <div className="space-y-3">
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex flex-col gap-1 shadow-inner"><span className="text-green-500 text-[10px] uppercase tracking-wider font-bold"><CheckCircle2 size={12} className="inline mr-1" /> Active</span></div>
              <button onClick={() => setIsEditingApiKey(true)} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-[11px] uppercase font-bold">Edit Key</button>
            </div>
          ) : (
            <div className="space-y-3 font-bold">
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="YouTube API Key" className="w-full bg-[#0b0b0b] border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:border-red-600 outline-none shadow-inner" />
              <button disabled={saveStatus === 'saving' || !apiKey.trim()} className="w-full bg-[#00e676] text-black py-2.5 rounded-xl text-sm transition hover:bg-[#00c853] active:scale-95 shadow-md font-bold" onClick={handleSaveApiKey}>{saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin inline" /> : <Save size={16} className="inline mr-1" />} Save</button>
            </div>
          )}
        </section>

        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800 shadow-sm text-left">
          <h2 className="text-xs text-gray-400 flex items-center gap-2 mb-4 uppercase tracking-widest font-bold underline underline-offset-4 decoration-white/5"><Search size={14}/> 채널검색</h2>
          <div className="space-y-3">
            <input value={directQuery} onChange={(e) => setDirectQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch('direct')} placeholder="채널명, @핸들, URL" className="w-full bg-[#0b0b0b] border border-gray-800 rounded-xl px-4 py-2 text-sm focus:border-red-600 outline-none shadow-inner" />
            <button onClick={() => handleSearch('direct')} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition active:scale-95 uppercase text-[11px] font-bold">Search Channel</button>
          </div>
        </section>
        
        <section className="bg-[#1e1e1e] rounded-2xl p-4 border border-gray-800 shadow-sm text-left">
          <div className="flex items-center gap-2 mb-4 uppercase text-xs text-gray-400 underline underline-offset-4 decoration-white/5 tracking-widest font-bold"><Video size={14}/> 필터검색</div>
          <div className="space-y-4">
            <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold">검색 키워드</label><input value={keywordFilter.keyword} onChange={(e) => setKeywordFilter({...keywordFilter, keyword: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSearch('keyword')} placeholder="키워드 (게임, 브이로그...)" className="w-full bg-[#0b0b0b] border border-gray-800 rounded-xl px-4 py-2 text-sm outline-none shadow-inner" /></div>
            <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold">영상 길이</label><select value={keywordFilter.duration} onChange={(e) => setKeywordFilter({...keywordFilter, duration: e.target.value})} className="bg-[#0b0b0b] border border-gray-800 rounded-xl w-full p-2 text-sm focus:border-red-600 cursor-pointer font-bold"><option value="any">전체</option><option value="short">쇼츠</option><option value="medium">4~20분</option><option value="long">20분+</option></select></div>
            <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold">국가/언어</label><select value={keywordFilter.region} onChange={(e) => setKeywordFilter({...keywordFilter, region: e.target.value})} className="bg-[#0b0b0b] border border-gray-800 rounded-xl w-full p-2 text-sm focus:border-red-600 cursor-pointer font-bold"><option value="KR|ko">한국어</option><option value="US|en">영어</option><option value="JP|ja">일본어</option><option value="|">전체</option></select></div>
            <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold">📅 기간 필터</label><select value={keywordFilter.period} onChange={(e) => setKeywordFilter({...keywordFilter, period: e.target.value})} className="bg-[#0b0b0b] border border-gray-800 rounded-xl w-full p-2 text-sm font-bold"><option value="7">최근 7일</option><option value="14">최근 14일</option><option value="30">최근 30일</option><option value="365">최근 1년</option><option value="custom">직접 지정</option></select></div>
            
            {keywordFilter.period === 'custom' && (
              <div className="grid grid-cols-3 gap-1 animate-in slide-in-from-top-1">
                  <select value={keywordFilter.customYear} onChange={(e)=>setKeywordFilter({...keywordFilter, customYear: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg font-bold">
                      {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}년</option>)}
                  </select>
                  <select value={keywordFilter.customMonth} onChange={(e)=>setKeywordFilter({...keywordFilter, customMonth: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg font-bold">
                      {Array.from({length:12}, (_,i)=>(i+1).toString().padStart(2,'0')).map(m => <option key={m} value={m}>{m}월</option>)}
                  </select>
                  <input value={keywordFilter.customDay} onChange={(e)=>setKeywordFilter({...keywordFilter, customDay: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg font-bold" placeholder="1일"/>
              </div>
            )}

            <button onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="text-[11px] text-gray-500 flex items-center gap-1 hover:text-white transition py-1 font-bold">
              {isAdvancedOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {isAdvancedOpen ? "고급 설정 닫기" : "고급 설정 (조회수/구독자)"}
            </button>
            
            {isAdvancedOpen && (
              <div className="space-y-3 p-3 bg-black/30 rounded-xl border border-white/5 animate-in fade-in font-bold">
                  <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="space-y-1"><p className="text-[9px] text-gray-500 uppercase">Min Views</p><input value={keywordFilter.minViews} onChange={(e)=>setKeywordFilter({...keywordFilter, minViews: e.target.value})} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-lg p-2 text-xs font-bold" placeholder="0"/></div>
                      <div className="space-y-1"><p className="text-[9px] text-gray-500 uppercase">Max Views</p><input value={keywordFilter.maxViews} onChange={(e)=>setKeywordFilter({...keywordFilter, maxViews: e.target.value})} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-lg p-2 text-xs font-bold" placeholder="Max"/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="space-y-1"><p className="text-[9px] text-gray-500 uppercase">Min Subs</p><input value={keywordFilter.minSubs} onChange={(e)=>setKeywordFilter({...keywordFilter, minSubs: e.target.value})} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-lg p-2 text-xs font-bold" placeholder="0"/></div>
                      <div className="space-y-1"><p className="text-[9px] text-gray-500 uppercase">Max Subs</p><input value={keywordFilter.maxSubs} onChange={(e)=>setKeywordFilter({...keywordFilter, maxSubs: e.target.value})} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-lg p-2 text-xs font-bold" placeholder="Max"/></div>
                  </div>
                  <div className="space-y-1 text-left"><p className="text-[9px] text-gray-500 uppercase font-bold">결과 개수</p><select value={keywordFilter.maxResults} onChange={(e)=>setKeywordFilter({...keywordFilter, maxResults: e.target.value})} className="bg-black border border-gray-800 w-full p-2 rounded-lg text-xs font-bold"><option value="10">10개</option><option value="25">25개</option><option value="50">50개</option></select></div>
              </div>
            )}
            <button onClick={() => handleSearch('keyword')} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition active:scale-95 uppercase text-[11px] font-bold">Find Content</button>
          </div>
        </section>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full bg-[#0f0f0f]">
        <div className="p-8 pb-4 text-center shrink-0">
          <h1 className="text-4xl font-black italic uppercase text-white drop-shadow-lg">유튜브 채널 탐색기</h1>
        </div>
        <div className="px-8 mt-6 text-left shrink-0">
          <div className="flex gap-4 border-b border-gray-800 uppercase text-xs tracking-widest font-bold">
            <button onClick={() => setViewMode('search_video')} className={`pb-3 px-4 flex items-center gap-2 transition ${viewMode === 'search_video' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}><Video size={16}/> 필터검색 <span className="bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded-full text-[9px]">{videoResults.length}</span></button>
            <button onClick={() => setViewMode('search_channel')} className={`pb-3 px-4 flex items-center gap-2 transition ${viewMode === 'search_channel' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-white'}`}><Users size={16}/> 채널검색 <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full text-[9px]">{channelResults.length}</span></button>
            <button onClick={() => setViewMode('saved')} className={`pb-3 px-4 flex items-center gap-2 transition ${viewMode === 'saved' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-500 hover:text-white'}`}><ListVideo size={16}/> 저장목록 <span className="bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full text-[9px]">{savedChannels.length}</span></button>
          </div>
        </div>
        
        <div className="px-8 mt-4 text-left shrink-0">
          {viewMode === 'saved' ? (
            <div className="bg-[#1e1e1e] p-2 rounded-2xl border border-gray-800 flex items-center justify-between font-bold">
              <div className="flex gap-2 overflow-x-auto no-scrollbar p-1">
                <button onClick={() => setActiveTab('전체')} className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === '전체' ? 'bg-red-600 text-white' : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#2c2c2c]'}`}>전체</button>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setActiveTab(cat.name)} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${activeTab === cat.name ? 'bg-orange-600 text-white' : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#2c2c2c]'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>{cat.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pr-2 shrink-0">
                <button onClick={() => setIsModalOpen(true)} className="p-2 text-gray-400 hover:text-white transition bg-[#0f0f0f] rounded-xl border border-gray-800"><FolderEdit size={16} /></button>
                {savedChannels.length > 0 && <button onClick={() => { if (window.confirm('전체 삭제하시겠습니까?')) savedChannels.forEach(ch => deleteDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', ch.id))); }} className="p-2 text-red-500 hover:bg-red-500/10 transition bg-[#0f0f0f] rounded-xl border border-gray-800 shadow-inner"><Trash2 size={16} /></button>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
              <span className="text-[10px] text-gray-500 uppercase mr-2 font-bold">Sort by:</span>
              {[
                { label: "조회수 순", key: "views" }, { label: "구독자 순", key: "subs" }, { label: "효율 순", key: "efficiency" }, { label: "최신 순", key: "publishTime" }
              ].map(s => (
                <button key={s.key} onClick={() => setSortKey(s.key)} className={`px-4 py-1.5 rounded-full text-[11px] border transition font-bold ${sortKey === s.key ? 'bg-white text-black border-white shadow-lg' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>{s.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-8 flex-1 overflow-y-auto custom-scrollbar text-center">
          {user && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-bold">
              {viewMode === 'search_video' && (isLoading ? (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 size={48} className="mb-4 animate-spin text-red-600 opacity-50" />
                  <p className="uppercase tracking-widest font-bold">Searching Videos...</p>
                </div>
              ) : sortedVideos.length > 0 ? (
                sortedVideos.map(res => (<ChannelCard key={res.videoId} result={res} onSave={handleSave} onAnalyze={setAnalysisChannel} isSavedView={false} categories={categories} mode="video" onUpdateMemo={()=>{}} onUpdateCategory={()=>{}} />))
              ) : (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-3xl font-bold">
                  <Search size={48} className="mb-4 opacity-10 text-blue-600" />
                  <p className="text-gray-400 tracking-tight text-center">검색 결과가 없습니다.</p>
                </div>
              ))}

              {viewMode === 'search_channel' && (isLoading ? (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500">
                  <Loader2 size={48} className="mb-4 animate-spin text-red-600 opacity-50" />
                  <p className="uppercase tracking-widest font-bold">Searching Channels...</p>
                </div>
              ) : sortedChannels.length > 0 ? (
                sortedChannels.map(res => (<ChannelCard key={res.channelId} result={res} onSave={handleSave} onAnalyze={setAnalysisChannel} isSavedView={false} categories={categories} mode="channel" onUpdateMemo={()=>{}} onUpdateCategory={()=>{}} />))
              ) : (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-3xl font-bold">
                  <Search size={48} className="mb-4 opacity-10 text-red-600" />
                  <p className="text-gray-400 tracking-tight text-center">검색된 채널이 없습니다.</p>
                </div>
              ))}

              {viewMode === 'saved' && (filteredSaved.length > 0 ? (
                filteredSaved.map(ch => (<ChannelCard key={ch.id} result={ch} onRemove={(id) => deleteDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id))} onUpdateMemo={(id, m) => updateDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id), { memo: m })} onUpdateCategory={(id, c) => updateDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id), { category: c })} onAnalyze={setAnalysisChannel} isSavedView={true} categories={categories} mode={ch.type} />))
              ) : (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-3xl font-bold">
                  <ListVideo size={48} className="mb-4 opacity-10 text-green-600" />
                  <p className="text-gray-400 tracking-tight">저장된 채널이 없습니다.</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categories={categories} onAdd={(n) => addDoc(collection(fbServices.db, 'artifacts', appId, 'users', user.uid, 'categories'), { name: n.trim() })} onDelete={(id) => deleteDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'categories', id))} />
      <AnalysisModal isOpen={!!analysisChannel} onClose={() => setAnalysisChannel(null)} channel={analysisChannel} apiKey={apiKey} />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
        @media (max-width: 768px) {
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        }
      `}</style>
    </div>
  );
}