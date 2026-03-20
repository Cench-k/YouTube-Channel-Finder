import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Search, Plus, Trash2, ExternalLink, X, Save, FolderEdit, Youtube,
  Calendar, BookmarkPlus, ListVideo, Users, PlaySquare, Loader2, Edit3, Check, 
  FileText, Cloud, CloudOff, Database, Info, AlertCircle, RefreshCw, BookOpen,
  ArrowRight, ShieldCheck, Zap, LogIn, LogOut, User, CheckCircle, CheckCircle2, Sparkles, Video,
  BarChart3, TrendingUp, Filter, SortAsc, Clock, Activity, ThumbsUp, MessageCircle,
  ChevronDown, ChevronUp, Tag, Languages, Radio
} from 'lucide-react';

// Firebase 라이브러리
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, signOut
} from 'firebase/auth';
import { 
  getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc
} from 'firebase/firestore';

const appId = "yt-finder-v1"; 

// --- 유틸리티 및 데이터 ---

const VIDEO_CATEGORIES = {
    "1": "영화/애니메이션", "2": "자동차", "10": "음악", "15": "애완동물/동물", "17": "스포츠",
    "18": "단편영화", "19": "여행/이벤트", "20": "게임", "21": "일상/브이로그", "22": "인물/블로그",
    "23": "코미디", "24": "엔터테인먼트", "25": "뉴스/정치", "26": "노하우/스타일", "27": "교육",
    "28": "과학기술", "29": "비영리/사회운동"
};

const parseISO8601Duration = (duration) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "00:00";
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatNumber = (n) => {
  if (!n) return "0";
  const num = parseInt(n);
  if (num >= 100000000) return (num / 100000000).toFixed(1) + "억";
  if (num >= 10000) return (num / 10000).toFixed(1) + "만";
  if (num >= 1000) return (num / 1000).toFixed(1) + "천";
  return num.toString();
};

const ERROR_GUIDES = {
  101: { title: "인증 서비스 미활성화", desc: "Authentication 서비스가 시작되지 않았습니다.", steps: ["콘솔 > 보안 > Authentication 클릭", "[시작하기] 클릭", "새로고침"] },
  102: { title: "인증 방법 미설정", desc: "익명 또는 구글 로그인이 꺼져 있습니다.", steps: ["로그인 방법 탭에서 [익명] 및 [Google] 사용 설정", "새로고침"] },
  201: { title: "데이터베이스 권한 거부", desc: "보안 규칙이 설정되지 않았습니다.", steps: ["Firestore > Rules 탭", "가이드의 규칙 코드 게시", "새로고침"] },
  301: { title: "유튜브 API 키 오류", desc: "API 키가 잘못되었거나 할당량이 초과되었습니다.", steps: ["Google Cloud Console에서 키 확인", "YouTube API v3 활성화 확인"] }
};

// --- 서브 컴포넌트 ---

const ErrorDisplay = ({ code, rawMessage, onReset }) => {
  const guide = ERROR_GUIDES[code];
  return (
    <div className="bg-orange-500/10 border border-orange-500/20 text-orange-500 p-6 rounded-2xl animate-in slide-in-from-top-2 shadow-lg font-bold w-full max-w-lg text-left mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 text-black text-[10px] px-2 py-1 rounded font-mono">ERR-{code}</div>
          <h2 className="text-lg">{guide?.title || "오류 발생"}</h2>
        </div>
        <AlertCircle size={20} className="opacity-50" />
      </div>
      <p className="text-sm opacity-90 mb-4">{guide?.desc || rawMessage || "문제가 발생했습니다."}</p>
      {guide && (
        <div className="space-y-2 bg-black/20 p-4 rounded-xl border border-orange-500/10 mb-4">
          {guide.steps.map((s, i) => <div key={i} className="flex gap-2 text-[12px] text-gray-300 font-medium"><span className="text-orange-500 font-bold">{i+1}.</span><p>{s}</p></div>)}
        </div>
      )}
      <div className="flex gap-2 font-black">
        <button onClick={() => window.location.reload()} className="flex-1 bg-orange-600 text-white py-2 rounded-xl hover:bg-orange-700 transition">새로고침</button>
        {onReset && <button onClick={onReset} className="px-4 border border-orange-500/50 text-orange-500 rounded-xl hover:bg-orange-500/10 transition">초기화</button>}
      </div>
    </div>
  );
};

const SetupGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in zoom-in duration-300 font-bold text-white">
      <div className="bg-[#1a1a1a] w-full max-w-2xl border border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313]">
          <h2 className="text-xl flex items-center gap-2 font-black"><Zap className="text-yellow-400" size={24} /> 상세 설정 가이드</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-white/5 rounded-full"><X size={24} /></button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-10 text-sm">
          <section className="relative pl-8 text-left">
            <div className="absolute left-0 top-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black">1</div>
            <h3 className="text-lg mb-2">Firebase 프로젝트 설정</h3>
            <p className="text-gray-400 font-normal">Google 로그인 후 Firebase 콘솔에서 프로젝트를 생성하고 웹 앱을 추가하세요. 제공되는 `firebaseConfig` 객체를 복사하여 입력창에 붙여넣으면 됩니다.</p>
          </section>
          <section className="relative pl-8 text-left">
            <div className="absolute left-0 top-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-black">2</div>
            <h3 className="text-lg mb-2">인증 서비스 활성화</h3>
            <p className="text-gray-400 font-normal">Authentication 메뉴에서 '익명' 및 'Google' 로그인 방법을 활성화해야 데이터 저장이 가능합니다.</p>
          </section>
          <section className="relative pl-8 text-left">
            <div className="absolute left-0 top-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-xs font-black">3</div>
            <h3 className="text-lg mb-2 font-black">Firestore 규칙 게시</h3>
            <pre className="bg-black/50 p-3 rounded-lg text-blue-300 font-mono text-[10px] overflow-x-auto select-all mt-2">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/yt-finder-v1/users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
            </pre>
          </section>
        </div>
        <div className="p-6 bg-black/40 border-t border-gray-800">
          <button onClick={onClose} className="w-full bg-blue-600 py-4 rounded-2xl font-black hover:bg-blue-700 transition active:scale-95 shadow-xl">확인했습니다</button>
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
          const channelId = channel.channelId;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const afterStr = thirtyDaysAgo.toISOString();

          const [chRes, searchRes] = await Promise.all([
            fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet,brandingSettings&id=${channelId}&key=${apiKey}`),
            fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=50&publishedAfter=${afterStr}&key=${apiKey}`)
          ]);

          const chData = await chRes.json();
          const searchData = await searchRes.json();
          const videos = searchData.items || [];
          const chFullInfo = chData.items?.[0] || {};
          const chStats = chFullInfo.statistics || {};
          const branding = chFullInfo.brandingSettings || {};
          
          let detailedVideos = [];
          if (videos.length > 0) {
            const vIds = videos.map(v => v.id.videoId).join(',');
            const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${vIds}&key=${apiKey}`);
            const vData = await vRes.json();
            detailedVideos = vData.items || [];
          }

          const now = new Date();
          const dateMap = {};
          for (let i = 0; i < 31; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            dateMap[d.toISOString().slice(0, 10)] = 0;
          }

          let uploadDaysCount = 0;
          detailedVideos.forEach(v => {
            const date = v.snippet.publishedAt.slice(0, 10);
            if (dateMap[date] !== undefined) {
                if (dateMap[date] === 0) uploadDaysCount++;
                dateMap[date]++;
            }
          });

          setStats({
            banner: branding.image?.bannerExternalUrl,
            keywords: branding.channel?.keywords ? branding.channel.keywords.split(' ') : [],
            dateMap,
            totalUploads: detailedVideos.length,
            uploadDays: uploadDaysCount,
            avgRecentViews: Math.round(detailedVideos.reduce((a, v) => a + parseInt(v.statistics.viewCount || 0), 0) / 30),
            avgAllTimeViews: Math.round(parseInt(chStats.viewCount || 0) / Math.max((Date.now() - new Date(chFullInfo.snippet?.publishedAt).getTime()) / 86400000, 1)),
            subCount: chStats.subscriberCount,
            maxViews: detailedVideos.length ? Math.max(...detailedVideos.map(v => parseInt(v.statistics.viewCount || 0))) : 0,
            recentVideos: detailedVideos.slice(0, 10),
            isLive: chFullInfo.snippet?.liveBroadcastContent === 'live'
          });
        } catch (e) { console.error(e); } finally { setLoading(false); }
      };
      fetchAnalysis();
    }
  }, [isOpen, channel, apiKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] w-full max-w-3xl border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {!loading && stats?.banner && (
            <div className="w-full h-32 md:h-40 overflow-hidden relative shrink-0">
                <img src={stats.banner} className="w-full h-full object-cover opacity-60" alt="Banner" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] to-transparent"></div>
            </div>
        )}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-[#131313] shrink-0 relative z-10 font-black">
          <div className="flex items-center gap-4 min-w-0 text-left">
            <div className={`w-16 h-16 rounded-full overflow-hidden border-2 border-red-600/50 bg-gray-800 shrink-0 ${stats?.banner ? '-mt-12 shadow-xl' : ''}`}>
              <img src={channel?.thumbnail || channel?.thumb} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-white truncate">{channel?.name || channel?.title || channel?.channelTitle}</h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Analysis Report</p>
                {stats?.isLive && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-1"><Radio size={10}/> LIVE</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 bg-white/5 rounded-full border border-white/5"><X size={28} /></button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-10 font-bold flex-1 text-white">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 font-bold">
              <Loader2 className="animate-spin mb-4" size={48} />
              <p className="uppercase tracking-widest font-black">Analyzing Channel...</p>
            </div>
          ) : stats ? (
            <>
              {stats.keywords.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 font-sans"><Tag size={14} /> 주요 키워드</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.keywords.slice(0, 8).map((kw, i) => (
                      <span key={i} className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[11px] text-gray-400 font-medium">#{kw.replace(/[",]/g, '')}</span>
                    ))}
                  </div>
                </section>
              )}
              <section className="space-y-4 font-black text-left">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 font-sans"><BarChart3 size={16} className="text-red-500" /> 업로드 요약</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { val: stats.totalUploads, label: "30일 업로드", color: "text-red-600" },
                        { val: stats.totalUploads > 0 ? `약 ${(30/stats.totalUploads).toFixed(1)}일` : "-", label: "업로드 빈도", color: "text-red-500" },
                        { val: stats.uploadDays, label: "업로드 날수", color: "text-red-600" },
                        { val: formatNumber(stats.maxViews), label: "🏆 최다 조회수", color: "text-red-500" }
                    ].map((card, i) => (
                        <div key={i} className="bg-[#111] border border-gray-800 p-4 rounded-xl text-center shadow-inner">
                            <p className={`text-xl font-black ${card.color} leading-tight`}>{card.val}</p>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">{card.label}</p>
                        </div>
                    ))}
                </div>
              </section>
              <section className="space-y-4 text-left">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 font-sans"><TrendingUp size={16} className="text-green-500" /> 조회수 추정 비교</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-orange-600/5 border border-orange-600/20 p-5 rounded-2xl text-center">
                        <p className="text-3xl font-black text-orange-500">{formatNumber(stats.avgRecentViews)}</p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">최근 30일 일평균 조회수</p>
                    </div>
                    <div className="bg-blue-600/5 border border-blue-600/20 p-5 rounded-2xl text-center">
                        <p className="text-3xl font-black text-blue-500">{formatNumber(stats.avgAllTimeViews)}</p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">역대 일평균 조회수</p>
                    </div>
                 </div>
              </section>
              <div className="space-y-4 text-left font-black">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 font-sans"><Calendar size={16} /> 활동 달력</h3>
                <div className="grid grid-cols-7 gap-2 bg-black/30 p-4 rounded-2xl border border-white/5 text-center font-black">
                  {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                    <div key={d} className="text-[9px] text-gray-600 font-black mb-1">{d}</div>
                  ))}
                  {Object.entries(stats.dateMap).reverse().map(([date, count]) => (
                    <div key={date} className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition ${count > 0 ? 'bg-red-600/20 border-red-600/40 text-red-500 shadow-lg' : 'bg-white/5 border-transparent text-gray-700'}`}>
                      <span className="text-[9px] opacity-40">{date.split('-')[2]}</span>
                      {count > 0 && <span className="text-xs font-black">{count}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4 text-left font-black">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 font-sans"><ListVideo size={16} /> 최근 업로드 (10개)</h3>
                <div className="grid grid-cols-1 gap-3 text-white">
                  {stats.recentVideos.map(vid => {
                     const vViews = parseInt(vid.statistics.viewCount || 0);
                     const subCount = parseInt(stats.subCount) || 1;
                     return (
                        <a key={vid.id} href={`https://www.youtube.com/watch?v=${vid.id}`} target="_blank" rel="noreferrer" className="flex gap-4 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 group transition">
                            <div className="w-28 aspect-video rounded overflow-hidden shrink-0 bg-gray-900 relative">
                                <img src={vid.snippet.thumbnails.medium?.url} className="w-full h-full object-cover" alt="" />
                                <div className="absolute bottom-1 right-1 bg-black/80 text-[9px] px-1.5 py-0.5 rounded font-black text-white">{parseISO8601Duration(vid.contentDetails.duration)}</div>
                            </div>
                            <div className="min-w-0 flex-1 flex flex-col justify-between">
                                <p className="text-[13px] text-white font-black whitespace-normal line-clamp-2 leading-snug group-hover:text-red-400 transition">
                                    {vid.snippet.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-gray-500 font-bold">
                                    <span className="bg-red-600/10 text-red-500 px-1.5 rounded">{VIDEO_CATEGORIES[vid.snippet.categoryId] || "일반"}</span>
                                    <span className="flex items-center gap-1 font-sans"><TrendingUp size={12}/> {formatNumber(vViews)}</span>
                                    {vid.contentDetails.caption === "true" && <span className="flex items-center gap-1 text-blue-400"><Languages size={12}/> CC</span>}
                                    <span className="text-yellow-500 font-black ml-auto">효율 {(vViews/subCount).toFixed(1)}배</span>
                                </div>
                            </div>
                        </a>
                     )
                  })}
                </div>
              </div>
            </>
          ) : <div className="text-center py-20 text-gray-500">데이터가 없습니다.</div>}
        </div>
        <div className="p-5 bg-[#131313] border-t border-gray-800 flex flex-col gap-4 font-black">
            <div className="flex justify-center gap-6 font-black font-sans">
                <a href={`https://playboard.co/channel/${channel?.channelId}`} target="_blank" rel="noreferrer" className="text-[11px] text-gray-500 hover:text-white transition flex items-center gap-1.5 uppercase tracking-tighter">Playboard ↗</a>
                <a href={`https://blingapp.co/channel/${channel?.channelId}`} target="_blank" rel="noreferrer" className="text-[11px] text-gray-500 hover:text-white transition flex items-center gap-1.5 uppercase tracking-tighter">Bling ↗</a>
            </div>
            <button onClick={onClose} className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 font-black py-3.5 rounded-2xl transition active:scale-95 shadow-lg">분석 창 닫기</button>
        </div>
      </div>
    </div>
  );
};

const CategoryModal = ({ isOpen, onClose, categories, onAdd, onDelete }) => {
  const [newCat, setNewCat] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-bold text-white font-black">
      <div className="bg-[#1e1e1e] w-full max-w-md border border-gray-800 rounded-2xl shadow-2xl overflow-hidden font-bold">
        <div className="flex justify-between items-center p-5 border-b border-gray-800 font-black text-white">
          <h2 className="text-xl flex items-center gap-2 font-black font-bold"><FolderEdit size={20} className="text-red-500" /> 카테고리 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
        </div>
        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="새 카테고리 명" className="flex-1 bg-[#2c2c2c] border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-red-600 transition font-bold" onKeyDown={(e) => e.key === 'Enter' && (onAdd(newCat), setNewCat(''))} />
            <button onClick={() => { onAdd(newCat); setNewCat(''); }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-black">추가</button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {categories.map(cat => (
              <div key={cat.id} className="flex justify-between items-center p-4 bg-[#2c2c2c] rounded-xl group text-left">
                <span className="font-bold">{cat.name}</span>
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

  const handleMemoSave = () => { onUpdateMemo(result.id, tempMemo); setIsEditingMemo(false); };
  const isVideo = mode === 'video' || result.type === 'video';

  return (
    <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all flex flex-col h-full font-bold text-white shadow-lg font-black">
      <div className="flex gap-4 mb-4">
        <div onClick={() => onAnalyze(result)} className={`shrink-0 overflow-hidden shadow-inner flex items-center justify-center bg-gray-800 cursor-pointer hover:ring-2 hover:ring-red-500 transition ${isVideo ? 'w-24 h-14 rounded-lg' : 'w-16 h-16 rounded-full'}`}>
          {result.thumbnail || result.thumb ? <img src={result.thumbnail || result.thumb} alt="" className="w-full h-full object-cover" /> : <Youtube size={24} />}
        </div>
        <div className="flex-1 min-w-0 text-left font-black">
          <h3 className="text-[13px] text-white whitespace-normal line-clamp-2 leading-snug mb-1.5 h-10 font-black">
              {result.title || result.name}
          </h3>
          {isVideo && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-400 cursor-pointer transition truncate mb-2" onClick={(e) => { e.stopPropagation(); onAnalyze(result); }}>
                <Users size={10} />
                <span className="truncate">{result.channelTitle}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1 font-black">
             <span className="bg-gray-800 text-gray-400 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">{isVideo ? 'Video' : 'Channel'}</span>
             {result.efficiency > 0 && <span className="bg-orange-600/20 text-orange-400 text-[9px] px-2 py-0.5 rounded-full font-black">🔥 효율 {result.efficiency.toFixed(1)}배</span>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3 font-black">
        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-black font-sans text-left">Views</p>
          <p className="text-xs text-blue-400 font-black">{formatNumber(result.views || 0)}</p>
        </div>
        <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-black font-sans text-left">Subs</p>
          <p className="text-xs text-green-400 font-black">{formatNumber(result.subs || 0)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 text-left font-black">
        <span className="text-[10px] text-gray-500 flex items-center gap-1 font-bold"><Clock size={10}/> {result.date}</span>
        {result.uploadRate > 0 && <span className="text-[10px] text-blue-500/80 flex items-center gap-1 font-bold font-sans"><Activity size={10}/> 빈도 {result.uploadRate.toFixed(1)}/일</span>}
      </div>
      {isSavedView ? (
        <div className="mb-4 flex-1 font-bold">
          <div className="flex items-center justify-between mb-2">
            <select value={selectedCategory} onChange={(e) => onUpdateCategory(result.id, e.target.value)} className="bg-yellow-600/10 text-yellow-500 text-[10px] px-2 py-0.5 rounded-lg border border-yellow-600/20 outline-none cursor-pointer font-black font-sans">
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            {!isEditingMemo ? <button onClick={() => setIsEditingMemo(true)} className="text-gray-500 hover:text-white transition"><Edit3 size={14} /></button> : <button onClick={handleMemoSave} className="text-green-500 hover:text-green-400 transition"><Check size={16} /></button>}
          </div>
          {isEditingMemo ? <textarea autoFocus value={tempMemo} onChange={(e) => setTempMemo(e.target.value)} className="w-full bg-black/40 border border-gray-700 rounded-xl p-3 text-xs text-gray-300 focus:border-red-600 outline-none resize-none h-20 transition" /> : <div className="bg-black/20 rounded-xl p-3 min-h-[40px] border border-white/5 text-left font-normal text-[11px] text-gray-400 line-clamp-3">{result.memo || "작성된 메모가 없습니다."}</div>}
        </div>
      ) : (
        <div className="mb-4 text-left font-bold">
          <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-black">저장 위치</p>
          <select className="w-full bg-gray-800 text-gray-300 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none cursor-pointer font-bold font-sans" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.length > 0 ? categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>) : <option value="">카테고리 없음</option>}
          </select>
        </div>
      )}
      <div className="flex gap-2 mt-auto font-black font-bold">
        {!isSavedView ? <button onClick={() => onSave(result, selectedCategory, mode)} className="flex-1 bg-white text-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-95 shadow-md">저장하기</button> : (
          <button onClick={() => onRemove(result.id)} className="flex-1 bg-red-600/20 text-red-500 text-xs py-2.5 rounded-xl border border-red-600/30 hover:bg-red-600 hover:text-white transition">삭제</button>
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
  const [sortKey, setSortKey] = useState('efficiency');
  const [directQuery, setDirectQuery] = useState('');
  
  const [keywordFilter, setKeywordFilter] = useState({ 
    keyword: '', duration: 'any', region: 'KR|ko', period: '14',
    customYear: new Date().getFullYear().toString(), customMonth: '01', customDay: '01',
    order: 'viewCount', minViews: '', maxViews: '', minSubs: '', maxSubs: '', maxResults: '25'
  });
  
  const [errorCode, setErrorCode] = useState(null);
  const [rawError, setRawError] = useState('');

  const fbServices = useMemo(() => {
    if (!fbConfig) return null;
    try { 
      const existingApps = getApps();
      const app = existingApps.length > 0 ? existingApps[0] : initializeApp(fbConfig); 
      return { auth: getAuth(app), db: getFirestore(app) }; 
    } catch (err) { return "ERROR"; }
  }, [fbConfig]);

  const handleLogout = async () => {
    if (fbServices && fbServices !== "ERROR") {
      try {
        await signOut(fbServices.auth);
        setHasStarted(false);
        localStorage.removeItem('app-started');
        window.location.reload();
      } catch (e) { console.error(e); }
    }
  };

  const handleSave = async (res, cat, type) => {
    if (!fbServices || !user || !cat) { alert("카테고리를 선택하세요!"); return; }
    if (savedChannels.some(c => type === 'video' ? c.videoId === res.videoId : c.channelId === res.channelId)) { alert("이미 존재합니다."); return; }
    try { await addDoc(collection(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels'), { ...res, category: cat, type, memo: '', timestamp: Date.now() }); setViewMode('saved'); } catch(e) { alert("저장 실패"); }
  };

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
    const unsubSet = onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'youtube'), (d) => { if (d.exists()) { const k = d.data().key; if (k) { setApiKey(k); setIsApiKeySaved(true); setIsEditingApiKey(false); }}});
    return () => { unsubCat(); unsubCh(); unsubSet(); };
  }, [fbServices, user, hasStarted]);

  const filteredSaved = useMemo(() => savedChannels.filter(ch => activeTab === '전체' || ch.category === activeTab), [savedChannels, activeTab]);
  const sortedVideos = useMemo(() => [...videoResults].sort((a, b) => {
    if (sortKey === 'date') return new Date(b.publishTime) - new Date(a.publishTime);
    if (sortKey === 'uploads') return (b.uploadRate || 0) - (a.uploadRate || 0);
    return (b[sortKey] || 0) - (a[sortKey] || 0);
  }), [videoResults, sortKey]);

  const sortedChannels = useMemo(() => [...channelResults].sort((a, b) => {
    if (sortKey === 'date') return new Date(b.publishTime) - new Date(a.publishTime);
    if (sortKey === 'uploads') return (b.uploadRate || 0) - (a.uploadRate || 0);
    return (b[sortKey] || 0) - (a[sortKey] || 0);
  }), [channelResults, sortKey]);

  const handleSearch = async (type) => {
    const q = type === 'direct' ? directQuery.trim() : keywordFilter.keyword.trim();
    if (!q) return;
    if (!isApiKeySaved) { alert("API 키를 저장하세요."); return; }
    setIsLoading(true); setErrorCode(null);
    type === 'keyword' ? setViewMode('search_video') : setViewMode('search_channel');

    try {
      if (type === 'direct') {
          let fetchUrl = '';
          if (q.startsWith('@')) fetchUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&forHandle=${encodeURIComponent(q)}&key=${apiKey}`;
          else if (q.includes('youtube.com/')) {
              const urlMatch = q.match(/\/(?:channel\/|@)([\w-]+)/);
              if (urlMatch) {
                  const val = urlMatch[1];
                  fetchUrl = q.includes('/channel/') 
                    ? `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${val}&key=${apiKey}`
                    : `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&forHandle=@${val}&key=${apiKey}`;
              }
          }
          if (fetchUrl) {
              const res = await fetch(fetchUrl);
              const data = await res.json();
              if (data.items?.length) {
                  setChannelResults(data.items.map(c => ({
                      channelId: c.id, name: c.snippet.title, thumbnail: c.snippet.thumbnails.medium?.url,
                      subs: parseInt(c.statistics.subscriberCount || 0), views: parseInt(c.statistics.viewCount || 0),
                      date: new Date(c.snippet.publishedAt).toLocaleDateString(), publishTime: c.snippet.publishedAt,
                      uploadRate: parseInt(c.statistics.videoCount || 0) / Math.max((Date.now() - new Date(c.snippet.publishedAt).getTime()) / 86400000, 1),
                      type: 'channel'
                  })));
                  setIsLoading(false); return;
              }
          }
          const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=10&q=${encodeURIComponent(q)}&key=${apiKey}`);
          const searchData = await searchRes.json();
          const cIds = searchData.items?.map(i => i.id.channelId).join(',');
          if (cIds) {
              const detailRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${cIds}&key=${apiKey}`);
              const detailData = await detailRes.json();
              setChannelResults(detailData.items?.map(c => ({
                  channelId: c.id, name: c.snippet.title, thumbnail: c.snippet.thumbnails.medium?.url,
                  subs: parseInt(c.statistics.subscriberCount || 0), views: parseInt(c.statistics.viewCount || 0),
                  date: new Date(c.snippet.publishedAt).toLocaleDateString(), publishTime: c.snippet.publishedAt,
                  uploadRate: parseInt(c.statistics.videoCount || 0) / Math.max((Date.now() - new Date(c.snippet.publishedAt).getTime()) / 86400000, 1),
                  type: 'channel'
              })) || []);
          }
      } else {
        const [regionCode, langCode] = keywordFilter.region.split('|');
        const publishedAfter = keywordFilter.period === 'custom' ? new Date(parseInt(keywordFilter.customYear), parseInt(keywordFilter.customMonth) - 1, parseInt(keywordFilter.customDay) || 1).toISOString() : new Date(Date.now() - parseInt(keywordFilter.period) * 86400000).toISOString();
        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${keywordFilter.maxResults}&q=${encodeURIComponent(q)}&key=${apiKey}&order=${keywordFilter.order}&publishedAfter=${publishedAfter}`;
        if (keywordFilter.duration !== 'any') url += `&videoDuration=${keywordFilter.duration}`;
        if (regionCode) url += `&regionCode=${regionCode}`;
        if (langCode) url += `&relevanceLanguage=${langCode}`;
        
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) { setErrorCode(301); throw new Error(data.error.message); }
        const items = data.items || [];
        const vIds = items.map(i => i.id.videoId).join(',');
        const vRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${vIds}&key=${apiKey}`);
        const vData = await vRes.json();
        const vStatsMap = {}; vData.items?.forEach(v => vStatsMap[v.id] = v);

        const cIds = [...new Set(items.map(i => i.snippet.channelId))].join(',');
        const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${cIds}&key=${apiKey}`);
        const cData = await cRes.json();
        const cStatsMap = {}; cData.items?.forEach(c => cStatsMap[c.id] = c);

        let results = items.map(i => {
          const vFull = vStatsMap[i.id.videoId] || { statistics: {}, contentDetails: {} };
          const chD = cStatsMap[i.snippet.channelId] || { snippet: {}, statistics: {} };
          const views = parseInt(vFull.statistics.viewCount || 0);
          const subs = parseInt(chD.statistics.subscriberCount || 1);
          return { videoId: i.id.videoId, channelId: i.snippet.channelId, title: i.snippet.title, channelTitle: i.snippet.channelTitle, thumbnail: i.snippet.thumbnails.medium?.url, date: new Date(i.snippet.publishedAt).toLocaleDateString(), publishTime: i.snippet.publishedAt, views, subs, efficiency: views / subs, uploadRate: parseInt(chD.statistics.videoCount || 0) / Math.max((Date.now() - new Date(chD.snippet.publishedAt || 0).getTime()) / 86400000, 1), type: 'video' };
        });
        if (keywordFilter.minViews) results = results.filter(r => r.views >= parseInt(keywordFilter.minViews));
        if (keywordFilter.maxViews) results = results.filter(r => r.views <= parseInt(keywordFilter.maxViews));
        if (keywordFilter.minSubs) results = results.filter(r => r.subs >= parseInt(keywordFilter.minSubs));
        if (keywordFilter.maxSubs) results = results.filter(r => r.subs <= parseInt(keywordFilter.maxSubs));
        setVideoResults(results);
      }
    } catch(err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleSaveConfig = () => {
    try {
      const match = configInput.match(/\{[\s\S]*\}/); if (!match) throw new Error();
      const cleanJson = match[0].replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1').replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":').replace(/:\s*[']([^']*)[']/g, ': "$1"').replace(/,\s*([}\]])/g, '$1').replace(/\s+/g, ' ');
      const parsed = JSON.parse(cleanJson);
      if (parsed.apiKey && (parsed.projectId || parsed.projectid)) {
        const final = { ...parsed, projectId: parsed.projectId || parsed.projectid };
        localStorage.setItem('user-fb-config', JSON.stringify(final)); setFbConfig(final);
      } else throw new Error();
    } catch (err) { alert("파이어베이스 설정 형식이 올바르지 않습니다."); }
  };

  if (isAuthLoading) return <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center font-black text-white"><RefreshCw size={48} className="text-blue-600 animate-spin mb-4" /><p className="uppercase tracking-widest text-sm">System Initializing...</p></div>;

  if (!fbConfig || !hasStarted || !user) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-6 font-black text-center font-sans">
        <div className="max-w-2xl w-full my-10 space-y-8 bg-[#1e1e1e] p-10 md:p-14 rounded-[3rem] border border-gray-800 shadow-2xl relative overflow-hidden flex flex-col items-center animate-in fade-in zoom-in duration-500">
          {!fbConfig ? (
            <div className="space-y-8 relative z-10 w-full">
              <Database size={48} className="text-blue-600 mx-auto animate-pulse" />
              <h1 className="text-4xl uppercase tracking-tighter italic font-black">Server Connect</h1>
              <div className="space-y-4 text-left w-full">
                <div className="flex justify-between items-end px-1 font-black"><label className="text-xs uppercase"><Info size={14} className="inline mr-1"/> Firebase SDK</label><button onClick={() => setIsGuideOpen(true)} className="text-[11px] text-blue-500 underline">설정 가이드</button></div>
                <textarea value={configInput} onChange={(e) => setConfigInput(e.target.value)} placeholder={'const firebaseConfig = { ... };'} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-2xl p-5 text-[11px] h-40 outline-none focus:border-blue-600 font-mono text-blue-100 font-black" />
                <button onClick={handleSaveConfig} className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-[1.5rem] text-lg shadow-xl flex items-center justify-center gap-3 transition active:scale-95 font-black">연결하기 <ArrowRight size={20} /></button>
              </div>
            </div>
          ) : (
            <div className="space-y-10 w-full font-black">
              <CheckCircle size={48} className="text-green-500 mx-auto" />
              <h1 className="text-4xl uppercase tracking-tighter italic">Connected</h1>
              <div className="grid grid-cols-1 gap-4 font-black">
                <button onClick={async () => { const provider = new GoogleAuthProvider(); await signInWithPopup(fbServices.auth, provider); }} className="group w-full bg-white hover:bg-gray-100 text-black py-7 rounded-[1.8rem] transition active:scale-95 shadow-2xl flex flex-col items-center justify-center gap-2 border-4 border-blue-600/5 font-black">
                   <div className="flex items-center gap-3 text-xl font-black"><LogIn size={26} className="text-blue-600" /> Google 로그인 시작</div>
                   <p className="text-[11px] text-gray-500 uppercase font-black">모든 기기에서 내 목록을 불러옵니다</p>
                </button>
                <button onClick={async () => { await signInAnonymously(fbServices.auth); }} className="w-full bg-transparent border border-gray-700 text-gray-400 py-5 rounded-[1.5rem] hover:text-white transition text-sm">게스트로 시작</button>
              </div>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[11px] text-gray-600 hover:text-red-500 underline font-black">서버 정보 초기화</button>
            </div>
          )}
        </div>
        <SetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col md:flex-row font-black selection:bg-red-500/30 tracking-tight font-bold text-sm font-sans">
      <aside className="w-full md:w-80 border-r border-gray-800 p-6 flex flex-col gap-6 overflow-y-auto shrink-0 custom-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-black font-sans"><Youtube className="text-red-600" size={32} /><h1 className="text-xl italic font-black">YT Finder</h1></div>
          <button onClick={handleLogout} className="p-2 bg-gray-800 rounded-xl hover:bg-red-600 transition" title="Logout"><LogOut size={16} /></button>
        </div>
        <section className={`bg-[#1e1e1e] rounded-2xl p-5 border ${isApiKeySaved ? 'border-gray-800' : 'border-red-600/50 animate-pulse'} shadow-sm relative overflow-hidden font-bold`}><h2 className="text-xs text-gray-400 flex items-center gap-2 mb-3 uppercase tracking-widest underline underline-offset-4 decoration-red-600/30 font-black"><Settings size={14} className="font-black" /> API Settings</h2>{(isApiKeySaved && !isEditingApiKey) ? (<div className="space-y-3 font-black"><div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 flex flex-col gap-1 shadow-inner font-bold font-black"><span className="text-green-500 text-[10px] uppercase tracking-wider font-bold font-black"><CheckCircle2 size={12} className="inline mr-1" /> Active</span></div><button onClick={() => setIsEditingApiKey(true)} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-[11px] uppercase font-bold font-black">Edit Key</button></div>) : (<div className="space-y-3 font-bold"><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="YouTube API Key" className="w-full bg-[#0b0b0b] border border-gray-800 rounded-xl px-4 py-2.5 text-sm focus:border-red-600 outline-none font-bold shadow-inner font-black" /><button disabled={saveStatus === 'saving' || !apiKey.trim()} className="w-full bg-[#00e676] text-black font-black py-2.5 rounded-xl text-sm transition hover:bg-[#00c853] active:scale-95 shadow-md font-bold font-black" onClick={() => { if (!apiKey.trim()) return; setSaveStatus('saving'); setDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'settings', 'youtube'), { key: apiKey.trim() }).then(() => { setIsApiKeySaved(true); setIsEditingApiKey(false); setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 3000); }); }}>{saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin inline font-black" /> : <Save size={16} className="inline mr-1" />} Save</button></div>)}</section>
        <section className="bg-[#1e1e1e] rounded-2xl p-5 border border-gray-800 shadow-sm font-black text-left"><h2 className="text-xs text-gray-400 flex items-center gap-2 mb-4 uppercase tracking-widest underline underline-offset-4 decoration-white/5 font-black"><Search size={14} className="font-black" /> 채널검색</h2><div className="space-y-3 font-black"><input value={directQuery} onChange={(e) => setDirectQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch('direct')} placeholder="채널명, @핸들, URL" className="w-full bg-[#0b0b0b] border border-gray-800 rounded-xl px-4 py-2 text-sm focus:border-red-600 outline-none shadow-inner font-black" /><button onClick={() => handleSearch('direct')} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl transition active:scale-95 uppercase text-[11px] font-black">Search Channel</button></div></section>
        <section className="bg-[#1e1e1e] rounded-2xl p-5 border border-gray-800 shadow-sm font-black font-bold text-left"><div className="flex items-center gap-2 mb-4 uppercase text-xs text-gray-400 underline underline-offset-4 decoration-white/5 tracking-widest font-black"><Video size={14} className="font-black" /> 필터검색 (영상)</div><div className="space-y-4 font-bold font-black">
          <div className="space-y-1 font-black"><label className="text-[10px] text-gray-500 font-black">검색 키워드</label><input value={keywordFilter.keyword} onChange={(e) => setKeywordFilter({...keywordFilter, keyword: e.target.value})} onKeyDown={(e) => e.key === 'Enter' && handleSearch('keyword')} placeholder="키워드 (게임, 뷰티...)" className="w-full bg-[#0b0b0b] border border-gray-800 rounded-xl px-4 py-2 text-sm outline-none shadow-inner font-black" /></div>
          <div className="space-y-1 font-black"><label className="text-[10px] text-gray-500 font-black">영상 길이</label><select value={keywordFilter.duration} onChange={(e) => setKeywordFilter({...keywordFilter, duration: e.target.value})} className="bg-[#0b0b0b] border border-gray-800 rounded-xl w-full p-2 text-sm outline-none focus:border-red-600 cursor-pointer font-bold"><option value="any">전체</option><option value="short">쇼츠</option><option value="medium">4~20분</option><option value="long">20분+</option></select></div>
          <div className="space-y-1 font-black"><label className="text-[10px] text-gray-500 font-black">국가/언어</label><select value={keywordFilter.region} onChange={(e) => setKeywordFilter({...keywordFilter, region: e.target.value})} className="bg-[#0b0b0b] border border-gray-800 rounded-xl w-full p-2 text-sm outline-none focus:border-red-600 cursor-pointer font-bold"><option value="KR|ko">한국어</option><option value="US|en">영어</option><option value="JP|ja">일본어</option><option value="|">전체</option></select></div>
          <div className="space-y-1 font-black"><label className="text-[10px] text-gray-500 font-black font-black">📅 기간 필터</label><select value={keywordFilter.period} onChange={(e) => setKeywordFilter({...keywordFilter, period: e.target.value})} className="bg-[#0b0b0b] border border-gray-800 rounded-xl w-full p-2 text-sm outline-none font-bold font-black"><option value="7">최근 7일</option><option value="14">최근 14일</option><option value="30">최근 30일</option><option value="365">최근 1년</option><option value="custom">직접 지정</option></select></div>
          {keywordFilter.period === 'custom' && (
            <div className="grid grid-cols-3 gap-1 animate-in slide-in-from-top-1 font-black">
                <select value={keywordFilter.customYear} onChange={(e)=>setKeywordFilter({...keywordFilter, customYear: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg">
                    {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select value={keywordFilter.customMonth} onChange={(e)=>setKeywordFilter({...keywordFilter, customMonth: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg">
                    {Array.from({length:12}, (_,i)=>(i+1).toString().padStart(2,'0')).map(m => <option key={m} value={m}>{m}월</option>)}
                </select>
                <input value={keywordFilter.customDay} onChange={(e)=>setKeywordFilter({...keywordFilter, customDay: e.target.value})} className="bg-black border border-gray-800 p-2 text-[10px] rounded-lg font-black" placeholder="1일"/>
            </div>
          )}
          <button onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="text-[11px] text-gray-500 flex items-center gap-1 hover:text-white transition py-1 font-black font-sans">
            {isAdvancedOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} {isAdvancedOpen ? "고급 설정 닫기" : "고급 설정 열기"}
          </button>
          {isAdvancedOpen && (
            <div className="space-y-3 p-3 bg-black/30 rounded-xl border border-white/5 animate-in fade-in font-black">
                <div className="grid grid-cols-2 gap-2 text-left font-black">
                    <div className="space-y-1"><p className="text-[9px] text-gray-500 uppercase font-black font-black">Min Views</p><input value={keywordFilter.minViews} onChange={(e)=>setKeywordFilter({...keywordFilter, minViews: e.target.value})} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-lg p-2 text-xs font-black" placeholder="0"/></div>
                    <div className="space-y-1"><p className="text-[9px] text-gray-500 uppercase font-black font-black">Max Views</p><input value={keywordFilter.maxViews} onChange={(e)=>setKeywordFilter({...keywordFilter, maxViews: e.target.value})} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-lg p-2 text-xs font-black" placeholder="Max"/></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-left font-black">
                    <div className="space-y-1"><p className="text-[9px] text-gray-500 uppercase font-black font-black">Min Subs</p><input value={keywordFilter.minSubs} onChange={(e)=>setKeywordFilter({...keywordFilter, minSubs: e.target.value})} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-lg p-2 text-xs font-black" placeholder="0"/></div>
                    <div className="space-y-1"><p className="text-[9px] text-gray-500 uppercase font-black font-black">Max Subs</p><input value={keywordFilter.maxSubs} onChange={(e)=>setKeywordFilter({...keywordFilter, maxSubs: e.target.value})} className="w-full bg-[#0b0b0b] border border-gray-800 rounded-lg p-2 text-xs font-black" placeholder="Max"/></div>
                </div>
                <div className="space-y-1 text-left font-black"><p className="text-[9px] text-gray-500 uppercase font-black">결과 개수</p><select value={keywordFilter.maxResults} onChange={(e)=>setKeywordFilter({...keywordFilter, maxResults: e.target.value})} className="bg-black border border-gray-800 w-full p-2 rounded-lg text-xs font-black"><option value="10">10개</option><option value="25">25개</option><option value="50">50개</option></select></div>
            </div>
          )}
          <button onClick={() => handleSearch('keyword')} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition active:scale-95 uppercase text-[11px] font-bold font-black">Find Content</button>
        </div></section>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 font-bold font-black">
        <div className="p-8 pb-4 text-center font-bold font-black">
          <h1 className="text-4xl font-black italic uppercase text-white drop-shadow-lg font-sans">유튜브 채널 탐색기</h1>
        </div>
        <div className="px-8 mt-6 font-bold text-left"><div className="flex gap-4 border-b border-gray-800 uppercase text-xs tracking-widest font-bold font-sans"><button onClick={() => setViewMode('search_video')} className={`pb-3 px-4 flex items-center gap-2 transition font-bold ${viewMode === 'search_video' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500 hover:text-white'}`}><Video size={16} /> 필터검색 <span className="bg-blue-500/20 text-blue-500 px-1.5 py-0.5 rounded-full text-[9px] font-black font-sans">{videoResults.length}</span></button><button onClick={() => setViewMode('search_channel')} className={`pb-3 px-4 flex items-center gap-2 transition font-bold ${viewMode === 'search_channel' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:text-white'}`}><Users size={16} /> 채널검색 <span className="bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded-full text-[9px] font-black font-sans">{channelResults.length}</span></button><button onClick={() => setViewMode('saved')} className={`pb-3 px-4 flex items-center gap-2 transition font-bold ${viewMode === 'saved' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-500 hover:text-white'}`}><ListVideo size={16} /> 저장목록 <span className="bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded-full text-[9px] font-black font-sans">{savedChannels.length}</span></button></div></div>
        
        <div className="px-8 mt-4 font-bold text-left">
          {viewMode === 'saved' ? (<div className="bg-[#1e1e1e] p-2 rounded-2xl border border-gray-800 flex items-center justify-between font-bold"><div className="flex gap-2 overflow-x-auto no-scrollbar p-1 font-bold"><button onClick={() => setActiveTab('전체')} className={`px-4 py-2 rounded-xl text-xs font-black transition font-bold ${activeTab === '전체' ? 'bg-red-600 text-white shadow-md' : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#2c2c2c]'}`}>전체</button>{categories.map(cat => (<button key={cat.id} onClick={() => setActiveTab(cat.name)} className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 font-bold ${activeTab === cat.name ? 'bg-orange-600 text-white shadow-md' : 'bg-[#0f0f0f] text-gray-400 hover:bg-[#2c2c2c]'}`}><span className="w-1.5 h-1.5 rounded-full bg-orange-400 font-bold"></span>{cat.name}</button>))}</div><div className="flex gap-2 pr-2 shrink-0 font-bold"><button onClick={() => setIsModalOpen(true)} className="p-2 text-gray-400 hover:text-white transition bg-[#0f0f0f] rounded-xl border border-gray-800" title="카테고리 관리"><FolderEdit size={16} /></button>{savedChannels.length > 0 && <button onClick={() => { if (window.confirm('전체 삭제하시겠습니까?')) savedChannels.forEach(ch => deleteDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', ch.id))); }} className="p-2 text-red-500 hover:bg-red-500/10 transition bg-[#0f0f0f] rounded-xl border border-gray-800 shadow-inner font-black font-black" title="전체 비우기"><Trash2 size={16} /></button>}</div></div>) : (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 font-bold"><span className="text-[10px] text-gray-500 uppercase mr-2 font-black"><SortAsc size={12} className="inline mr-1 font-sans" /> Sort by:</span>{[
              { label: "효율 순", key: "efficiency" }, { label: "조회수 순", key: "views" }, { label: "구독자 순", key: "subs" }, { label: "최신 순", key: "date" }, { label: "업로드 빈도", key: "uploads" }
            ].map(s => (<button key={s.key} onClick={() => setSortKey(s.key)} className={`px-4 py-1.5 rounded-full text-[11px] border transition font-bold ${sortKey === s.key ? 'bg-white text-black border-white' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}>{s.label}</button>))}</div>
          )}
        </div>

        <div className="px-8 py-8 flex-1 overflow-y-auto custom-scrollbar font-bold text-center">
          {errorCode && <ErrorDisplay code={errorCode} rawMessage={rawError} onReset={() => { localStorage.clear(); window.location.reload(); }} />}
          {user && (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-bold">
            {viewMode === 'search_video' && (isLoading ? (<div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 font-bold font-black"><Loader2 size={48} className="mb-4 animate-spin text-red-600 opacity-50 font-black" /><p className="uppercase tracking-widest font-sans font-black font-black">Searching Videos...</p></div>) : 
              sortedVideos.length > 0 ? (sortedVideos.map(res => (<ChannelCard key={res.videoId} result={res} onSave={handleSave} onAnalyze={setAnalysisChannel} isSavedView={false} categories={categories} mode="video" onUpdateMemo={()=>{}} onUpdateCategory={()=>{}} />))) : 
              (<div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-3xl font-bold font-black"><Search size={48} className="mb-4 opacity-10 text-blue-600" /><p className="text-gray-400 tracking-tight text-center font-bold font-black font-black">검색 결과가 없습니다.<br/>왼쪽 필터에서 검색을 시작하세요.</p></div>)
            )}
            {viewMode === 'search_channel' && (isLoading ? (<div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 font-bold font-black"><Loader2 size={48} className="mb-4 animate-spin text-red-600 opacity-50 font-black" /><p className="uppercase tracking-widest font-sans font-black font-black">Searching Channels...</p></div>) : 
              sortedChannels.length > 0 ? (sortedChannels.map(res => (<ChannelCard key={res.channelId} result={res} onSave={handleSave} onAnalyze={setAnalysisChannel} isSavedView={false} categories={categories} mode="channel" onUpdateMemo={()=>{}} onUpdateCategory={()=>{}} />))) : 
              (<div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-3xl font-bold font-black"><Search size={48} className="mb-4 opacity-10 text-red-600" /><p className="text-gray-400 tracking-tight text-center font-bold font-black font-black">검색된 채널이 없습니다.<br/>채널명이나 핸들을 입력하세요.</p></div>)
            )}
            {viewMode === 'saved' && (filteredSaved.length > 0 ? (filteredSaved.map(ch => (<ChannelCard key={ch.id} result={ch} onRemove={(id) => deleteDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id))} onUpdateMemo={(id, m) => updateDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id), { memo: m })} onUpdateCategory={(id, c) => updateDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'channels', id), { category: c })} onAnalyze={setAnalysisChannel} isSavedView={true} categories={categories} mode={ch.type} />))) : (<div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-3xl font-bold font-black"><ListVideo size={48} className="mb-4 opacity-10 text-green-600 font-black" /><p className="text-gray-400 tracking-tight font-black font-bold font-black">저장된 채널이 없습니다.</p></div>))}
          </div>)}
        </div>
      </main>

      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} categories={categories} onAdd={(n) => addDoc(collection(fbServices.db, 'artifacts', appId, 'users', user.uid, 'categories'), { name: n.trim() })} onDelete={(id) => deleteDoc(doc(fbServices.db, 'artifacts', appId, 'users', user.uid, 'categories', id))} />
      <AnalysisModal isOpen={!!analysisChannel} onClose={() => setAnalysisChannel(null)} channel={analysisChannel} apiKey={apiKey} />
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
    </div>
  );
}