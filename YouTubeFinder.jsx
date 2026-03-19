import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Settings, 
  Youtube, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  X, 
  StickyNote, 
  BarChart2, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  Edit2, 
  Sparkles, 
  Layers, 
  LayoutGrid, 
  Users,
  ShieldCheck,
  Globe,
  Tag
} from 'lucide-react';

const App = () => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState('saved');
  const [apiKey, setApiKey] = useState('');
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [savedChannels, setSavedChannels] = useState([]);
  const [categories, setCategories] = useState([]); // 초기 카테고리 비우기
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // --- 데이터 유지 (LocalStorage) ---
  useEffect(() => {
    const storedKey = localStorage.getItem('yt_finder_api_key');
    const storedChannels = localStorage.getItem('yt_finder_saved_channels');
    const storedCats = localStorage.getItem('yt_finder_categories');
    
    if (storedKey) { 
      setApiKey(storedKey); 
      setIsApiKeySaved(true); 
    }
    
    if (storedChannels) { 
      setSavedChannels(JSON.parse(storedChannels)); 
    } else {
      // 초기 채널 데이터 비우기
      setSavedChannels([]);
    }
    
    if (storedCats) {
      setCategories(JSON.parse(storedCats));
    } else {
      // 초기 카테고리 데이터 비우기
      setCategories([]);
    }
  }, []);

  // --- 핸들러 함수 ---
  const saveApiKey = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('yt_finder_api_key', apiKey);
    setIsApiKeySaved(true);
  };

  const deleteChannel = (id) => {
    if (!window.confirm('이 채널을 삭제하시겠습니까?')) return;
    const updated = savedChannels.filter(c => c.id !== id);
    setSavedChannels(updated);
    localStorage.setItem('yt_finder_saved_channels', JSON.stringify(updated));
  };

  const addCategory = () => {
    if (!newCatName.trim()) return;
    
    // 중복 체크
    if (categories.some(cat => cat.name === newCatName)) {
      alert('이미 존재하는 카테고리입니다.');
      return;
    }

    const gradients = [
      'from-rose-500 to-orange-500',
      'from-indigo-500 to-purple-500',
      'from-cyan-500 to-blue-500',
      'from-emerald-500 to-teal-500',
      'from-amber-500 to-yellow-500',
      'from-violet-500 to-fuchsia-500'
    ];
    const randomGrad = gradients[Math.floor(Math.random() * gradients.length)];
    const updated = [...categories, { name: newCatName, color: randomGrad }];
    setCategories(updated);
    localStorage.setItem('yt_finder_categories', JSON.stringify(updated));
    setNewCatName('');
  };

  const removeCategory = (name) => {
    if (!window.confirm(`'${name}' 카테고리를 삭제하시겠습니까?`)) return;
    const updated = categories.filter(cat => cat.name !== name);
    setCategories(updated);
    localStorage.setItem('yt_finder_categories', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-rose-500/30 pb-20 overflow-x-hidden">
      {/* 배경 조명 효과 */}
      <div className="fixed -top-[10%] -left-[10%] w-[40%] h-[40%] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* 헤더 */}
      <header className="relative z-10 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <Sparkles size={14} className="text-rose-400" />
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-400 font-bold">차세대 채널 발굴 시스템</span>
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-slate-500 mb-2 italic uppercase">
            유튜브 채널 찾기
          </h1>
          <div className="h-1 w-20 bg-gradient-to-r from-rose-600 to-indigo-600 rounded-full"></div>
        </div>
      </header>

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        
        {/* 사이드바 */}
        <aside className="lg:col-span-3 space-y-6">
          {/* API 설정 카드 */}
          <section className="bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 shadow-2xl overflow-hidden relative group">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-6">
              <Settings size={14} /> API 구성 설정
            </h3>
            
            {!isApiKeySaved ? (
              <div className="space-y-4">
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API v3 키를 입력하세요..." 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-white shadow-inner"
                />
                <button onClick={saveApiKey} className="w-full bg-white text-black font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-95">
                  인증 키 저장하기
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase">
                  <CheckCircle2 size={14} /> 연결 완료
                </div>
                <button onClick={() => setIsApiKeySaved(false)} className="text-[10px] font-black text-slate-500 hover:text-rose-400 transition-colors">재설정</button>
              </div>
            )}
          </section>

          {/* 검색 필터 카드 */}
          <section className="bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-8 shadow-2xl space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">검색 키워드</label>
                <div className="relative">
                  <input type="text" placeholder="관심 주제를 검색하세요..." className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:outline-none focus:border-rose-500/50 transition-all text-white" />
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">영상 옵션</label>
                  <div className="flex gap-2">
                    <select className="flex-1 bg-[#151515] border border-white/10 rounded-xl p-3 text-[10px] font-bold focus:outline-none appearance-none cursor-pointer text-white">
                      <option>쇼츠 모드</option>
                      <option>일반 영상</option>
                    </select>
                    <select className="flex-1 bg-[#151515] border border-white/10 rounded-xl p-3 text-[10px] font-bold focus:outline-none appearance-none cursor-pointer text-white">
                      <option>한국어</option>
                      <option>영어</option>
                    </select>
                  </div>
                </div>
              </div>

              <button className="w-full py-5 rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 hover:scale-[1.02] active:scale-95 transition-all">
                분석 시작
              </button>
            </div>

            <div className="pt-2 border-t border-white/5">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-[10px] font-black uppercase text-slate-500 hover:text-slate-300 transition-colors tracking-widest"
              >
                상세 조건 설정
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showAdvanced && (
                <div className="mt-4 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><BarChart2 size={10}/> 정렬 기준</div>
                      <select className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-[10px] font-bold text-white outline-none cursor-pointer">
                        <option value="relevance">관련성순 (기본)</option>
                        <option value="viewCount">조회수순</option>
                        <option value="videoCount">업로드 영상수순</option>
                        <option value="rating">평점순</option>
                        <option value="date">최신 생성순</option>
                      </select>
                   </div>

                   <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Users size={10}/> 최소 구독자수</div>
                      <input 
                        type="number" 
                        placeholder="1,000" 
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-[10px] font-bold focus:outline-none text-white shadow-inner" 
                      />
                   </div>

                   <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Tag size={10}/> 콘텐츠 주제</div>
                      <select className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-[10px] font-bold text-white outline-none cursor-pointer">
                        <option value="">전체 카테고리</option>
                        <option value="/m/04rlf">음악 (Music)</option>
                        <option value="/m/0bzvm2">게임 (Gaming)</option>
                        <option value="/m/06ntj">스포츠 (Sports)</option>
                        <option value="/m/02jjt">엔터테인먼트 (Entertainment)</option>
                        <option value="/m/019_sj">라이프스타일 (Lifestyle)</option>
                        <option value="/m/025at">지식/학습 (Society/Knowledge)</option>
                      </select>
                   </div>

                   <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Globe size={10}/> 검색 지역</div>
                      <select className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-[10px] font-bold text-white outline-none cursor-pointer">
                        <option value="KR">대한민국 (KR)</option>
                        <option value="US">미국 (US)</option>
                        <option value="JP">일본 (JP)</option>
                        <option value="GLOBAL">전세계 (Global)</option>
                      </select>
                   </div>

                   <div className="space-y-2">
                      <div className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><ShieldCheck size={10}/> 안전 검색</div>
                      <select 
                        defaultValue="moderate"
                        className="w-full bg-black/20 border border-white/5 rounded-xl p-3 text-[10px] font-bold text-white outline-none cursor-pointer"
                      >
                        <option value="none">제한 없음 (None)</option>
                        <option value="moderate">보통 (Moderate)</option>
                        <option value="strict">엄격 (Strict)</option>
                      </select>
                   </div>
                </div>
              )}
            </div>
          </section>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="lg:col-span-9 space-y-8">
          {/* 네비게이션 탭 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-2 p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl w-fit">
              <button onClick={() => setActiveTab('results')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'results' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>실시간 검색</button>
              <button onClick={() => setActiveTab('saved')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'saved' ? 'bg-white text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>나의 컬렉션</button>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setIsManageModalOpen(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                <Layers size={14} className="text-rose-500" /> 관리
              </button>
              <button onClick={() => { if(window.confirm('모든 채널을 삭제하시겠습니까?')) setSavedChannels([]); }} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                <Trash2 size={14} /> 전체 삭제
              </button>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-3">
            {categories.length > 0 && (
              <button className="px-6 py-2.5 rounded-full bg-white text-black text-[10px] font-black uppercase shadow-lg shadow-white/5">전체 보기</button>
            )}
            {categories.map((cat, idx) => (
              <button key={idx} className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase text-slate-400 hover:border-white/30 hover:text-white transition-all flex items-center gap-2 group">
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${cat.color}`}></div>
                {cat.name}
              </button>
            ))}
            {categories.length === 0 && activeTab === 'saved' && (
              <div className="text-xs text-slate-500 italic py-2">등록된 카테고리가 없습니다. '관리' 버튼을 눌러 추가해 보세요.</div>
            )}
          </div>

          {/* 채널 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'saved' && savedChannels.map((channel) => (
              <div key={channel.id} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-indigo-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] p-8 h-full flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:border-white/20 shadow-2xl overflow-hidden">
                  <button onClick={() => deleteChannel(channel.id)} className="absolute top-6 right-6 text-slate-600 hover:text-rose-500 transition-colors z-10">
                    <X size={20} />
                  </button>

                  <div className="space-y-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden bg-slate-800/50 shadow-inner relative group-hover:border-white/30 transition-all">
                        {channel.thumbnail ? (
                          <img 
                            src={channel.thumbnail} 
                            alt={channel.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xl font-black italic text-slate-500 bg-gradient-to-br from-slate-700 to-slate-900">
                            {channel.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xl font-black text-white truncate group-hover:text-rose-400 transition-colors">{channel.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-black uppercase text-slate-500 tracking-tighter">
                            {channel.category}
                          </div>
                          <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                            <Users size={10} /> {channel.subscribers}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">
                        <StickyNote size={12} /> 개인 분석 메모
                      </div>
                      <p className="text-[11px] text-rose-200/70 font-medium leading-relaxed italic">
                        "{channel.memo || '작성된 메모가 없습니다. 분석 내용을 기록해보세요.'}"
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button className="flex-1 bg-white text-black py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg">
                      분석하기 <BarChart2 size={14} />
                    </button>
                    <button className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                      <ExternalLink size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {activeTab === 'saved' && savedChannels.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[3rem] opacity-20">
                <LayoutGrid size={48} className="mb-4 text-white" />
                <p className="font-black uppercase tracking-widest text-white">저장된 채널이 없습니다</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* --- 카테고리 관리 모달 --- */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#121212] border border-white/10 rounded-[3rem] w-full max-w-xl shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-10 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">카테고리 관리</h2>
              <button onClick={() => setIsManageModalOpen(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-rose-500 transition-colors text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-10 space-y-10">
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  placeholder="새 카테고리 이름 입력..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none text-white shadow-inner font-bold"
                />
                <button onClick={addCategory} className="bg-white text-black px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-rose-500 hover:text-white transition-all">추가</button>
              </div>
              <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {categories.map((cat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-white/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${cat.color}`}></div>
                      <span className="text-xs font-black uppercase text-slate-300">{cat.name}</span>
                    </div>
                    <button onClick={() => removeCategory(cat.name)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-xs text-slate-600 italic">등록된 카테고리가 없습니다.</div>
                )}
              </div>
            </div>
            <div className="p-10 bg-black/20 border-t border-white/5 flex justify-end">
              <button onClick={() => setIsManageModalOpen(false)} className="px-8 py-3 rounded-xl bg-white text-black font-black text-[11px] tracking-widest hover:bg-rose-500 hover:text-white transition-all">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;