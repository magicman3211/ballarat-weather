import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, BarChart2, Calendar, Droplets, Sun, Moon, LayoutDashboard, CalendarDays, Calendar as CalendarIcon, Menu, X } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, Legend, LabelList
} from 'recharts';

gsap.registerPlugin(ScrollTrigger);

const API_BASE = import.meta.env.PROD ? '/api/weather' : 'http://localhost:8001/api/weather';

export default function App() {
  const container = useRef();

  const [months, setMonths] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [weatherData, setWeatherData] = useState([]);
  const [stats, setStats] = useState(null);
  
  const [activeMenu, setActiveMenu] = useState('Daily Weather');
  const [allTimeMonths, setAllTimeMonths] = useState([]);
  const [monthlyAverages, setMonthlyAverages] = useState([]);
  const [yearlyAverages, setYearlyAverages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [yearlySliderIndex, setYearlySliderIndex] = useState(0);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  // Initial Fetch: Months, All-Time Monthly Stats & Yearly Stats
  useEffect(() => {
    fetch(`${API_BASE}/months`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setMonths(data);
          const years = [...new Set(data.map(m => m.substring(0, 4)))];
          setAvailableYears(years);
          setSelectedYear(data[0].substring(0, 4));
          setSelectedMonth(data[0].substring(4, 6));
        }
      })
      .catch(console.error);

    fetch(`${API_BASE}/all_time_months`)
      .then(res => res.json())
      .then(data => setAllTimeMonths(data))
      .catch(console.error);

    fetch(`${API_BASE}/yearly_stats`)
      .then(res => res.json())
      .then(data => {
        setYearlyAverages(data);
        if (data.length > 5) {
          setYearlySliderIndex(data.length - 5);
        } else {
          setYearlySliderIndex(0);
        }
      })
      .catch(console.error);
  }, []);

  // Fetch Daily Data for chosen Year/Month
  useEffect(() => {
    if (!selectedYear || !selectedMonth) return;
    fetch(`${API_BASE}/${selectedYear}/${selectedMonth}`)
      .then(res => res.json())
      .then(data => setWeatherData(data))
      .catch(console.error);
  }, [selectedYear, selectedMonth]);

  // Fetch Monthly Stats for chosen Year and combine with all-time monthly stats
  useEffect(() => {
    if (!selectedYear) return;
    fetch(`${API_BASE}/stats/${selectedYear}`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(d => {
           const monthStr = d.month_code.substring(4, 6);
           const date = new Date(parseInt(selectedYear), parseInt(monthStr) - 1);
           
           const allTimeData = allTimeMonths.find(atm => atm.month === monthStr);
           const allTimeAvgTemp = allTimeData && allTimeData.all_time_avg_max !== null && allTimeData.all_time_avg_min !== null
             ? ((allTimeData.all_time_avg_max + allTimeData.all_time_avg_min) / 2).toFixed(1)
             : null;

           return {
             ...d,
             monthName: date.toLocaleDateString('en-GB', { month: 'short' }),
             avgTemp: allTimeAvgTemp
           };
        });
        setMonthlyAverages(formatted);
      })
      .catch(console.error);
  }, [selectedYear, allTimeMonths]);

  // Calculate generic stats for the loaded daily data
  useEffect(() => {
    if (!weatherData.length) return;
    const avgMin = weatherData.reduce((acc, d) => acc + (d.min_temp || 0), 0) / weatherData.length;
    const avgMax = weatherData.reduce((acc, d) => acc + (d.max_temp || 0), 0) / weatherData.length;
    const totalRain = weatherData.reduce((acc, d) => acc + (d.rainfall || 0), 0);
    setStats({
      avgMin: avgMin.toFixed(1),
      avgMax: avgMax.toFixed(1),
      totalRain: totalRain.toFixed(1)
    });
  }, [weatherData]);

  // GSAP
  useEffect(() => {
    if (!container.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.feature-card', {
        scrollTrigger: { trigger: '.features-section', start: 'top 75%' },
        y: 50,
        opacity: 0,
        stagger: 0.1,
        duration: 1,
        ease: 'power2.out'
      });
    }, container);
    return () => ctx.revert();
  }, [activeMenu, selectedMonth]);

  const formattedMonth = (selectedYear && selectedMonth) ? `${selectedYear}-${selectedMonth}` : '';
  const availableMonthsForCurrentYear = months.filter(m => m.startsWith(selectedYear));

  let thermalTicks = [];
  let thermalDomain = ['auto', 'auto'];
  if (weatherData.length > 0) {
    const validMinTemps = weatherData.filter(d => d.min_temp !== null).map(d => d.min_temp);
    const validMaxTemps = weatherData.filter(d => d.max_temp !== null).map(d => d.max_temp);
    if (validMinTemps.length > 0 && validMaxTemps.length > 0) {
      const minTick = Math.floor(Math.min(...validMinTemps) / 5) * 5;
      const maxTick = Math.ceil(Math.max(...validMaxTemps) / 5) * 5;
      for (let i = minTick; i <= maxTick; i += 5) thermalTicks.push(i);
      thermalDomain = [minTick, maxTick];
    }
  }

  // Calculate Overall Yearly Averages for the new requirement
  let overallYearlyMaxAvg = null;
  let overallYearlyMinAvg = null;
  if (yearlyAverages.length > 0) {
    const validMax = yearlyAverages.filter(y => y.avg_max !== null).map(y => y.avg_max);
    const validMin = yearlyAverages.filter(y => y.avg_min !== null).map(y => y.avg_min);
    if (validMax.length > 0) overallYearlyMaxAvg = validMax.reduce((a, b) => a + b, 0) / validMax.length;
    if (validMin.length > 0) overallYearlyMinAvg = validMin.reduce((a, b) => a + b, 0) / validMin.length;
  }
  
  const displayedYearlyAverages = yearlyAverages.slice(yearlySliderIndex, yearlySliderIndex + 5);

  return (
    <div ref={container} className="relative min-h-screen bg-background text-textPrimary selection:bg-champagne/30 selection:text-champagne overflow-x-hidden transition-colors duration-500 flex">
      <svg className="noise-overlay pointer-events-none fixed inset-0 w-full h-full z-50 opacity-[0.05] mix-blend-overlay">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      {/* Side Menu */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-white/10 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="font-heading font-semibold text-lg text-champagne">Weather Stats</div>
          <button className="md:hidden text-slate" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5"/></button>
        </div>
        <nav className="p-4 space-y-2">
          {[
            { name: 'Daily Weather', icon: LayoutDashboard },
            { name: 'Monthly Averages', icon: CalendarDays },
            { name: 'Yearly Averages', icon: CalendarIcon }
          ].map(item => (
            <button
              key={item.name}
              onClick={() => { setActiveMenu(item.name); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-heading text-sm transition-colors ${activeMenu === item.name ? 'bg-champagne/10 text-champagne' : 'text-slate hover:bg-white/5 hover:text-textPrimary'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen md:ml-64 flex flex-col relative w-full">
        <div className="navbar-container sticky top-0 z-40 px-4 md:px-8 py-6 flex flex-wrap items-center justify-between gap-4 w-full border-b border-white/10 bg-background/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5"/>
            </button>
            <div className="font-heading font-semibold text-base md:text-lg tracking-tight">
              {activeMenu}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {activeMenu !== 'Yearly Averages' && (
              <div className="flex items-center gap-2 group">
                <span className="font-heading text-sm font-semibold text-textMuted">Year:</span>
                <div className="relative">
                  <select
                    className="appearance-none bg-transparent font-data text-sm tracking-wider cursor-pointer pr-6 py-2 min-w-[80px] focus:outline-none text-right"
                    value={selectedYear}
                    onChange={(e) => {
                      setSelectedYear(e.target.value);
                      const avail = months.filter(m => m.startsWith(e.target.value));
                      if (avail.length > 0) setSelectedMonth(avail[0].substring(4, 6));
                    }}
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year} style={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', color: isDark ? '#FAF8F5' : '#1A1A1A' }}>{year}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-champagne pointer-events-none" />
                </div>
                {activeMenu === 'Daily Weather' && (
                  <>
                    <span className="font-heading text-sm font-semibold text-textMuted ml-4">Month:</span>
                    <div className="relative">
                      <select
                        className="appearance-none bg-transparent font-data text-sm tracking-wider cursor-pointer pr-6 py-2 min-w-[80px] focus:outline-none text-right"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      >
                        {availableMonthsForCurrentYear.map(m => {
                          const mStr = m.substring(4, 6);
                          const formatted = new Date(parseInt(selectedYear), parseInt(mStr) - 1).toLocaleDateString('en-GB', { month: 'short' });
                          return <option key={mStr} value={mStr} style={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', color: isDark ? '#FAF8F5' : '#1A1A1A' }}>{formatted}</option>;
                        })}
                      </select>
                      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-champagne pointer-events-none" />
                    </div>
                  </>
                )}
              </div>
            )}
            <button onClick={toggleTheme} className="p-2.5 rounded-full bg-surface border border-white/10 hover:border-champagne/50 transition-all duration-300 group">
              {isDark ? <Sun className="w-4 h-4 text-champagne group-hover:rotate-45 transition-transform" /> : <Moon className="w-4 h-4 text-slate group-hover:-rotate-12 transition-transform" />}
            </button>
          </div>
        </div>

        <section className="features-section relative w-full pt-8 pb-12 px-4 md:px-8 xl:px-12 transition-colors duration-500 flex-1">
          <div className="max-w-7xl mx-auto mb-6">
            <h2 className="text-2xl md:text-3xl font-heading font-medium tracking-tight mb-2">Atmospheric Telemetry</h2>
            <p className="text-slate flex flex-wrap items-center gap-2 md:gap-4 font-data text-xs md:text-sm">
              <span className="flex items-center gap-2 text-champagne"><span className="w-2 h-2 rounded-full bg-current animate-pulse"></span> LIVE FEED LINKED</span>
              {activeMenu === 'Daily Weather' && <span>{"//"} REPORT: {formattedMonth}</span>}
              {activeMenu === 'Monthly Averages' && <span>{"//"} REPORT: {selectedYear}</span>}
              {activeMenu === 'Yearly Averages' && <span>{"//"} REPORT: MULTI-YEAR</span>}
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6 items-stretch">
            {activeMenu === 'Daily Weather' && (
              <>
                <div className="feature-card flex flex-col bg-surface rounded-[2rem] p-6 border border-textPrimary/5 shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500">
                  <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart2 className="w-5 h-5 text-champagne" />
                        <h3 className="font-heading font-semibold text-xl">Daily Weather</h3>
                      </div>
                      <p className="text-sm text-textMuted">Min/Max temperatures for {formattedMonth}</p>
                    </div>
                    {/* Custom Legend for Daily Weather */}
                    <div className="flex flex-wrap items-center gap-4 bg-background/50 backdrop-blur pb-2 pt-2 px-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E63B2E]"></div><span className="text-xs font-data">Max Temps</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div><span className="text-xs font-data">Min Temps</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10B981]"></div><span className="text-xs font-data">Max Temp Avg</span></div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#EAB308]"></div><span className="text-xs font-data">Min Temp Avg</span></div>
                    </div>
                  </div>

                  <div className="w-full h-[450px] shrink-0">
                    {weatherData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weatherData} margin={{ top: 25, right: 30, bottom: 30, left: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A4A5A' : '#D1D5DB'} vertical={false} opacity={0.7} />
                          <XAxis dataKey="date" tickFormatter={(val) => val.split('-')[2]} stroke={isDark ? '#9CA3AF' : '#6B7280'} tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} dy={10} height={50} label={{ value: 'Days', position: 'insideBottom', fill: isDark ? '#6B7280' : '#4B5563', fontSize: 12, fontFamily: 'Inter', offset: -10 }} />
                          <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} dx={-10} width={60} ticks={thermalTicks} domain={thermalDomain} label={{ value: 'Temp °C', angle: -90, position: 'insideLeft', fill: isDark ? '#6B7280' : '#4B5563', fontSize: 12, fontFamily: 'Inter', style: { textAnchor: 'middle' }, offset: 5 }} />
                          <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', borderColor: '#C9A84C', borderRadius: '1rem', color: isDark ? '#FAF8F5' : '#1A1A1A', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} itemStyle={{ fontFamily: 'JetBrains Mono' }} labelStyle={{ fontFamily: 'Inter', fontWeight: 'bold', color: '#C9A84C', marginBottom: '8px' }} />
                          
                          {/* Daily Lines */}
                          <Line type="monotone" dataKey="max_temp" name="Max Temp °C" stroke="#E63B2E" strokeWidth={3} dot={{ r: 4, fill: '#E63B2E', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                          <Line type="monotone" dataKey="min_temp" name="Min Temp °C" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                          
                          {/* Reference Lines for Monthly Averages */}
                          {stats && stats.avgMax !== null && <ReferenceLine y={parseFloat(stats.avgMax)} stroke="#10B981" strokeDasharray="5 5" strokeWidth={2} label={{ value: `${stats.avgMax}°C`, fill: '#10B981', position: 'right', fontSize: 12, fontFamily: 'Inter' }} />}
                          {stats && stats.avgMin !== null && <ReferenceLine y={parseFloat(stats.avgMin)} stroke="#EAB308" strokeDasharray="5 5" strokeWidth={2} label={{ value: `${stats.avgMin}°C`, fill: '#EAB308', position: 'right', fontSize: 12, fontFamily: 'Inter' }} />}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-data text-slate animate-pulse">AWAITING DATA STREAM...</div>
                    )}
                  </div>
                </div>

                <div className="feature-card flex flex-col bg-surface rounded-[2rem] p-6 border border-textPrimary/5 shadow-xl hover:-translate-y-1 transition-transform duration-500">
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-champagne" />
                      <h3 className="font-heading font-semibold text-xl">Daily Rainfall</h3>
                      {stats && stats.totalRain && (
                        <span className="font-heading font-semibold text-lg text-[#3B82F6] ml-2">
                          — {stats.totalRain}mm Total
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-[360px] shrink-0">
                    {weatherData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weatherData} margin={{ top: 35, right: 30, bottom: 30, left: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A4A5A' : '#D1D5DB'} vertical={false} opacity={0.7} />
                          <XAxis dataKey="date" tickFormatter={val => val.split('-')[2]} stroke={isDark ? '#9CA3AF' : '#6B7280'} tickLine={false} axisLine={false} dy={10} />
                          <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} tickLine={false} axisLine={false} dx={-10} width={60} />
                          <RechartsTooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', borderRadius: '0.5rem', border: 'none' }} />
                          <Bar dataKey="rainfall" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                            {/* Use LabelList instead of inline label property for more visibility */}
                            <LabelList dataKey="rainfall" position="top" fill={isDark ? '#E5E7EB' : '#374151'} fontSize={10} fontWeight="bold" fontFamily="JetBrains Mono" formatter={(v) => v > 0 ? v : ''} />
                            {weatherData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.rainfall > 5 ? '#3B82F6' : '#60A5FA'} fillOpacity={entry.rainfall > 0 ? 1 : 0.2} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-data text-slate animate-pulse">AWAITING DATA STREAM...</div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeMenu === 'Monthly Averages' && (
              <div className="feature-card flex flex-col bg-surface rounded-[2rem] p-6 border border-textPrimary/5 shadow-2xl relative overflow-hidden hover:-translate-y-1 transition-transform duration-500">
                <div className="mb-6">
                  <h3 className="font-heading font-semibold text-xl text-champagne">Monthly Averages ({selectedYear})</h3>
                  <p className="text-sm text-textMuted">Max, Min, and All-Time Average temperature context</p>
                </div>
                <div className="w-full h-[500px]">
                  {monthlyAverages.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyAverages} margin={{ top: 25, right: 30, bottom: 30, left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A4A5A' : '#D1D5DB'} vertical={false} opacity={0.7} />
                        <XAxis dataKey="monthName" stroke={isDark ? '#9CA3AF' : '#6B7280'} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} axisLine={false} tickLine={false} dx={-10} width={60} label={{ value: 'Temp °C', angle: -90, position: 'insideLeft', fill: isDark ? '#6B7280' : '#4B5563', style: { textAnchor: 'middle' }, offset: 5, fontSize: 12, fontFamily: 'Inter' }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', borderColor: '#C9A84C', borderRadius: '1rem', color: isDark ? '#FAF8F5' : '#1A1A1A' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="avg_max" name="Selected Year Max Avg" stroke="#E63B2E" strokeWidth={3} dot={{ r: 5, fill: '#E63B2E', strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="avg_min" name="Selected Year Min Avg" stroke="#3B82F6" strokeWidth={3} dot={{ r: 5, fill: '#3B82F6', strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="avgTemp" name="All-Time Month Avg" stroke="#10B981" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 5, fill: '#10B981', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-data text-slate animate-pulse">AWAITING DATA STREAM...</div>
                  )}
                </div>
              </div>
            )}

            {activeMenu === 'Yearly Averages' && (
              <div className="feature-card flex flex-col bg-surface rounded-[2rem] p-6 border border-textPrimary/5 shadow-2xl relative overflow-hidden hover:-translate-y-1 transition-transform duration-500">
                <div className="mb-2">
                  <h3 className="font-heading font-semibold text-xl text-champagne">Yearly Averages</h3>
                  <p className="text-sm text-textMuted">Historical trends (5-year segments)</p>
                </div>
                
                {/* 5-Year Window Slider - Custom Timeline Component */}
                <div className="my-10 px-4 relative w-full flex flex-col items-center">
                  <div className="relative w-full h-12 flex items-center">
                    {/* Dashed line track */}
                    <div className="absolute top-1/2 left-0 right-0 h-0 border-t border-dashed border-textMuted/40 -translate-y-1/2 z-0"></div>
                    
                    {/* Tick marks every 5 years */}
                    <div className="absolute top-1/2 left-0 right-0 z-0 pointer-events-none">
                      {yearlyAverages.map((y, idx) => {
                        if (idx % 5 === 0) {
                          const percent = (idx / Math.max(1, yearlyAverages.length - 1)) * 100;
                          return (
                            <div key={y.year} className="absolute flex flex-col items-center -translate-x-1/2" style={{ left: `${percent}%`, top: '-14px' }}>
                              <div className="w-0.5 h-3 bg-textMuted/50 mb-1"></div>
                              <span className="text-[10px] font-data text-textMuted/70">{y.year}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>

                    {/* Styled Range Input */}
                    <input 
                      type="range" 
                      min="0" 
                      max={Math.max(0, yearlyAverages.length - 5)} 
                      value={yearlySliderIndex} 
                      onChange={(e) => setYearlySliderIndex(parseInt(e.target.value))}
                      className="absolute top-1/2 -translate-y-1/2 left-0 w-full z-10 appearance-none bg-transparent cursor-pointer focus:outline-none
                        [&::-webkit-slider-runnable-track]:w-full [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-24 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-[#6B7280] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-[#374151] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-105 [&::-webkit-slider-thumb]:hover:bg-[#9CA3AF]
                        [&::-moz-range-track]:w-full [&::-moz-range-track]:h-full [&::-moz-range-track]:bg-transparent [&::-moz-range-track]:border-transparent
                        [&::-moz-range-thumb]:w-24 [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:bg-[#6B7280] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-[#374151] [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-105 [&::-moz-range-thumb]:hover:bg-[#9CA3AF]"
                    />
                  </div>

                  {/* Active Selection Indicator */}
                  <div className="mt-4 bg-surface px-6 py-2 rounded-full border border-champagne/20 shadow-lg shadow-black/10 z-20 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-champagne animate-pulse"></span>
                    <span className="font-data text-sm tracking-wider font-semibold text-textPrimary">
                      {displayedYearlyAverages[0]?.year} - {displayedYearlyAverages[displayedYearlyAverages.length - 1]?.year}
                    </span>
                  </div>
                </div>

                <div className="w-full h-[450px]">
                  {displayedYearlyAverages.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={displayedYearlyAverages} margin={{ top: 25, right: 180, bottom: 30, left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A4A5A' : '#D1D5DB'} vertical={false} opacity={0.7} />
                        <XAxis dataKey="year" stroke={isDark ? '#9CA3AF' : '#6B7280'} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke={isDark ? '#9CA3AF' : '#6B7280'} axisLine={false} tickLine={false} dx={-10} width={60} label={{ value: 'Temp °C', angle: -90, position: 'insideLeft', fill: isDark ? '#6B7280' : '#4B5563', style: { textAnchor: 'middle' }, offset: 5, fontSize: 12, fontFamily: 'Inter' }} />
                        <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', borderColor: '#C9A84C', borderRadius: '1rem', color: isDark ? '#FAF8F5' : '#1A1A1A' }} />
                        
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        
                        <Line type="monotone" dataKey="avg_max" name="Yearly Max Temp" stroke="#E63B2E" strokeWidth={3} dot={{ r: 5, fill: '#E63B2E', strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="avg_min" name="Yearly Min Temp" stroke="#3B82F6" strokeWidth={3} dot={{ r: 5, fill: '#3B82F6', strokeWidth: 0 }} />
                        
                        {/* Dummy lines strictly for populating the Legend dynamically */}
                        <Line type="monotone" dataKey="dummy1" name="All-Time Max Avg" stroke="#10B981" strokeWidth={0} activeDot={false} dot={false} />
                        <Line type="monotone" dataKey="dummy2" name="All-Time Min Avg" stroke="#EAB308" strokeWidth={0} activeDot={false} dot={false} />

                        {/* Reference lines for all-time yearly min and max averages */}
                        {overallYearlyMaxAvg !== null && <ReferenceLine y={overallYearlyMaxAvg} stroke="#10B981" strokeDasharray="5 5" strokeWidth={2} label={{ value: `All-Time Max Avg (${overallYearlyMaxAvg.toFixed(1)}°C)`, fill: '#10B981', position: 'right', fontSize: 12, fontFamily: 'Inter' }} />}
                        {overallYearlyMinAvg !== null && <ReferenceLine y={overallYearlyMinAvg} stroke="#EAB308" strokeDasharray="5 5" strokeWidth={2} label={{ value: `All-Time Min Avg (${overallYearlyMinAvg.toFixed(1)}°C)`, fill: '#EAB308', position: 'right', fontSize: 12, fontFamily: 'Inter' }} />}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-data text-slate animate-pulse">AWAITING DATA STREAM...</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <footer className="mt-12 border-t border-white/5 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
             <div>
               <div className="font-heading font-bold text-lg tracking-tight text-textPrimary">BALLARAT CLIMATE</div>
               <div className="font-data text-xs text-textMuted uppercase tracking-widest mt-1">BOM DATA AGGREGATION SYSTEM</div>
             </div>
             <div className="flex items-center gap-3 bg-surface px-4 py-2 rounded-full border border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-data text-xs tracking-wider text-green-500/80">SYSTEM OPERATIONAL</span>
             </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
