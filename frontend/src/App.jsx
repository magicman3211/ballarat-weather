import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, BarChart2, Calendar, Droplets, ArrowRight, Sun, Moon } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
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
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true; // Default to dark
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

  // Data Fetching
  useEffect(() => {
    fetch(`${API_BASE}/months`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setMonths(data);

          // Extract unique years
          const years = [...new Set(data.map(m => m.substring(0, 4)))];
          setAvailableYears(years);

          const initialYear = data[0].substring(0, 4);
          const initialMonth = data[0].substring(4, 6);
          setSelectedYear(initialYear);
          setSelectedMonth(initialMonth);
        }
      })
      .catch(err => console.error("Failed to fetch months", err));
  }, []);

  useEffect(() => {
    if (!selectedYear || !selectedMonth) return;

    fetch(`${API_BASE}/${selectedYear}/${selectedMonth}`)
      .then(res => res.json())
      .then(data => {
        setWeatherData(data);
      })
      .catch(err => console.error("Failed to fetch weather data", err));
  }, [selectedYear, selectedMonth]);

  // Stats Calculation for visual clarity
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

  // Master GSAP Animation Hook
  useEffect(() => {
    if (!container.current) return;

    const ctx = gsap.context(() => {
      // Hero Animations
      gsap.from('.hero-text span', {
        y: 60,
        opacity: 0,
        stagger: 0.15,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.2
      });

      gsap.from('.hero-cta', {
        y: 40,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.8
      });


      // Feature Cards Entrance
      gsap.from('.feature-card', {
        scrollTrigger: {
          trigger: '.features-section',
          start: 'top 75%'
        },
        y: 50,
        opacity: 0,
        stagger: 0,
        duration: 1,
        ease: 'power2.out'
      });
    }, container);

    return () => ctx.revert();
  }, [selectedMonth]);

  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setSelectedYear(newYear);
    // Find the available months for this new year and select the most recent one
    const availableForYear = months.filter(m => m.startsWith(newYear));
    if (availableForYear.length > 0) {
      setSelectedMonth(availableForYear[0].substring(4, 6));
    }
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const formattedMonth = (selectedYear && selectedMonth) ? `${selectedYear}-${selectedMonth}` : '';

  // Filter months to only show those available for the currently selected year
  const availableMonthsForCurrentYear = months.filter(m => m.startsWith(selectedYear));

  // Calculate Y-Axis ticks for Thermal Variations (every 5 degrees)
  let thermalTicks = [];
  let thermalDomain = ['auto', 'auto'];
  if (weatherData.length > 0) {
    const validMinTemps = weatherData.filter(d => d.min_temp !== null).map(d => d.min_temp);
    const validMaxTemps = weatherData.filter(d => d.max_temp !== null).map(d => d.max_temp);
    if (validMinTemps.length > 0 && validMaxTemps.length > 0) {
      const minTemp = Math.min(...validMinTemps);
      const maxTemp = Math.max(...validMaxTemps);
      const minTick = Math.floor(minTemp / 5) * 5;
      const maxTick = Math.ceil(maxTemp / 5) * 5;
      for (let i = minTick; i <= maxTick; i += 5) {
        thermalTicks.push(i);
      }
      thermalDomain = [minTick, maxTick];
    }
  }

  return (
    <div ref={container} className="relative min-h-screen bg-background text-textPrimary selection:bg-champagne/30 selection:text-champagne overflow-x-hidden transition-colors duration-500">

      {/* SVG Noise Overlay */}
      <svg className="noise-overlay pointer-events-none fixed inset-0 w-full h-full z-50 opacity-[0.05] mix-blend-overlay">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      {/* Navbar: The Floating Island */}
      <div className="navbar-container absolute top-0 left-0 z-40 transition-all duration-500 px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4 w-full border-b border-white/10 bg-background/50 backdrop-blur-xl">
        <div className="font-heading font-semibold text-base md:text-lg tracking-tight text-center md:text-left [transition:color_0.3s]">
          Ballarat Weather Statistics
        </div>
        <div className="flex flex-wrap justify-center md:justify-end items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="flex items-center gap-2 group">
            <span className="font-heading text-sm font-semibold text-textMuted [transition:color_0.3s]">Year:</span>
            <div className="relative">
              <select
                className="appearance-none bg-transparent font-data text-sm tracking-wider cursor-pointer pr-6 py-3 min-w-[80px] focus:outline-none [transition:color_0.3s] text-right"
                value={selectedYear}
                onChange={handleYearChange}
              >
                {availableYears.length === 0 && <option value="" style={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', color: isDark ? '#FAF8F5' : '#1A1A1A' }}>Loading...</option>}
                {availableYears.map(year => (
                  <option key={year} value={year} style={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', color: isDark ? '#FAF8F5' : '#1A1A1A' }}>{year}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-champagne" />
            </div>

            <span className="font-heading text-sm font-semibold text-textMuted ml-4 [transition:color_0.3s]">Month:</span>
            <div className="relative">
              <select
                className="appearance-none bg-transparent font-data text-sm tracking-wider cursor-pointer pr-6 py-3 min-w-[80px] focus:outline-none [transition:color_0.3s] text-right"
                value={selectedMonth}
                onChange={handleMonthChange}
              >
                {availableMonthsForCurrentYear.length === 0 && <option value="" style={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', color: isDark ? '#FAF8F5' : '#1A1A1A' }}>Loading...</option>}
                {availableMonthsForCurrentYear.map(m => {
                  const mStr = m.substring(4, 6);
                  const date = new Date(parseInt(selectedYear), parseInt(mStr) - 1);
                  const formatted = date.toLocaleDateString('en-GB', { month: 'short' });
                  return <option key={mStr} value={mStr} style={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', color: isDark ? '#FAF8F5' : '#1A1A1A' }}>{formatted}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-champagne" />
            </div>

            {/* Theme Toggle Widget */}
            <button
              onClick={toggleTheme}
              className="ml-4 p-2.5 rounded-full bg-surface border border-white/10 hover:border-champagne/50 transition-all duration-300 group"
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-champagne group-hover:rotate-45 transition-transform duration-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate group-hover:-rotate-12 transition-transform duration-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Scrolled Navbar Styles via global css */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .nav-scrolled {
          background-color: rgba(13, 13, 18, 0.7) !important;
          backdrop-filter: blur(24px);
          border-color: rgba(201, 168, 76, 0.1) !important;
        }
        .nav-scrolled .font-heading {
          color: #C9A84C !important;
        }
      `}} />

      {/* Features / Data Dashboard: "Interactive Functional Artifacts" */}
      <section className="features-section relative w-full bg-background pt-40 md:pt-32 pb-12 px-4 md:px-12 lg:px-16 min-h-screen transition-colors duration-500">

        <div className="max-w-7xl mx-auto mb-6">
          <h2 className="text-2xl md:text-3xl font-heading font-medium tracking-tight mb-2">Atmospheric Telemetry</h2>
          <p className="text-slate flex flex-wrap items-center gap-2 md:gap-4 font-data text-xs md:text-sm">
            <span className="flex items-center gap-2 text-champagne"><span className="w-2 h-2 rounded-full bg-current animate-pulse"></span> LIVE FEED LINKED</span>
            <span>{"//"} REPORT: {formattedMonth}</span>
          </p>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

          {/* Top Row: Thermal Variations */}
          <div className="feature-card lg:col-span-3 flex flex-col bg-surface rounded-[2rem] p-6 border border-textPrimary/5 shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BarChart2 className="w-5 h-5 text-champagne" />
                  <h3 className="font-heading font-semibold text-xl">Ballarat Temperatures</h3>
                </div>
                <p className="text-sm text-textMuted">Min/Max temperatures for {formattedMonth}</p>
              </div>
            </div>

            <div className="w-full h-[450px] mt-2 shrink-0">
              {weatherData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weatherData} margin={{ top: 25, right: 30, bottom: 30, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A4A5A' : '#D1D5DB'} vertical={false} opacity={0.7} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => val.split('-')[2]}
                      stroke={isDark ? '#9CA3AF' : '#6B7280'}
                      tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                      height={50}
                      label={{ value: 'Days of the Month', position: 'insideBottom', fill: isDark ? '#6B7280' : '#4B5563', fontSize: 12, fontFamily: 'Inter', offset: -10 }}
                    />
                    <YAxis
                      stroke={isDark ? '#9CA3AF' : '#6B7280'}
                      tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                      width={60}
                      ticks={thermalTicks}
                      domain={thermalDomain}
                      label={{ value: 'Temp Degrees C', angle: -90, position: 'insideLeft', fill: isDark ? '#6B7280' : '#4B5563', fontSize: 12, fontFamily: 'Inter', style: { textAnchor: 'middle' }, offset: 5 }}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#1A1A24' : '#FFFFFF',
                        borderColor: '#C9A84C',
                        borderRadius: '1rem',
                        color: isDark ? '#FAF8F5' : '#1A1A1A',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                      itemStyle={{ fontFamily: 'JetBrains Mono' }}
                      labelStyle={{ fontFamily: 'Inter', fontWeight: 'bold', color: '#C9A84C', marginBottom: '8px' }}
                    />
                    <Line type="monotone" dataKey="max_temp" name="Max Temp °C" stroke="#E63B2E" strokeWidth={3} dot={{ r: 4, fill: '#E63B2E', strokeWidth: 0 }} activeDot={{ r: 7 }} animationDuration={1500} animationEasing="ease-in-out" />
                    <Line type="monotone" dataKey="min_temp" name="Min Temp °C" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 0 }} activeDot={{ r: 7 }} animationDuration={1500} animationEasing="ease-in-out" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center font-data text-slate animate-pulse">
                  AWAITING DATA STREAM...
                </div>
              )}
            </div>
          </div>

          {/* Middle Row: Precipitation Bar */}
          <div className="feature-card lg:col-span-3 flex flex-col bg-surface rounded-[2rem] p-6 border border-textPrimary/5 shadow-2xl hover:-translate-y-1 transition-transform duration-500">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-5 h-5 text-champagne" />
                  <h3 className="font-heading font-semibold text-xl">Ballarat Rainfall</h3>
                </div>
                <p className="text-sm text-textMuted">Daily rainfall metric (mm)</p>
              </div>
            </div>
            <div className="w-full h-[360px] mt-2 shrink-0">
              {weatherData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weatherData} margin={{ top: 25, right: 30, bottom: 30, left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4A4A5A' : '#D1D5DB'} vertical={false} opacity={0.7} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => val.split('-')[2]}
                      stroke={isDark ? '#9CA3AF' : '#6B7280'}
                      tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                      height={50}
                      label={{ value: 'Days of the Month', position: 'insideBottom', fill: isDark ? '#6B7280' : '#4B5563', fontSize: 12, fontFamily: 'Inter', offset: -10 }}
                    />
                    <YAxis
                      stroke={isDark ? '#9CA3AF' : '#6B7280'}
                      tick={{ fill: isDark ? '#9CA3AF' : '#6B7280', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                      width={60}
                      label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft', fill: isDark ? '#6B7280' : '#4B5563', fontSize: 12, fontFamily: 'Inter', style: { textAnchor: 'middle' }, offset: 5 }}
                    />
                    <RechartsTooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} contentStyle={{ backgroundColor: isDark ? '#1A1A24' : '#FFFFFF', borderRadius: '0.5rem', border: 'none', color: isDark ? '#FAF8F5' : '#1A1A1A', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} itemStyle={{ fontFamily: 'JetBrains Mono' }} labelStyle={{ fontFamily: 'Inter', fontWeight: 'bold', color: '#C9A84C', marginBottom: '8px' }} />
                    <Bar
                      dataKey="rainfall"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                      label={{ position: 'top', fill: '#C9A84C', fontSize: 12, fontFamily: 'JetBrains Mono', formatter: (val) => val > 0 ? val : '' }}
                    >
                      {weatherData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.rainfall > 5 ? '#3B82F6' : '#60A5FA'} fillOpacity={entry.rainfall > 0 ? 1 : 0.2} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center font-data text-slate animate-pulse">
                  AWAITING DATA STREAM...
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Statistics Summary */}
          <div className="feature-card lg:col-span-3 flex flex-col bg-surface rounded-[2rem] p-6 border border-textPrimary/5 shadow-2xl relative overflow-hidden hover:-translate-y-1 transition-transform duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-champagne/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-5 h-5 text-champagne" />
                  <h3 className="font-heading font-semibold text-xl text-champagne">Ballarat Averages</h3>
                </div>
                <p className="text-sm text-textMuted">Average metrics for {formattedMonth}</p>
              </div>
            </div>

            {stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 items-center pb-2 px-4">
                <div className="flex flex-col gap-2 md:border-r border-white/5 md:pr-8">
                  <span className="font-data text-xs text-textMuted tracking-wider uppercase">Average Max</span>
                  <span className="font-heading text-4xl font-light text-champagne">{stats.avgMax}°</span>
                </div>
                <div className="flex flex-col gap-2 md:border-r border-white/5 md:pr-8">
                  <span className="font-data text-xs text-textMuted tracking-wider uppercase">Average Min</span>
                  <span className="font-heading text-4xl font-light text-blue-400">{stats.avgMin}°</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="font-data text-xs text-textMuted tracking-wider uppercase">Total Rainfall</span>
                  <span className="font-heading text-4xl font-light text-blue-400">{stats.totalRain}<span className="text-lg">mm</span></span>
                </div>
              </div>
            ) : (
              <div className="font-data text-sm text-slate animate-pulse w-full py-8 flex items-center justify-center">CALCULATING AVERAGES...</div>
            )}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background rounded-t-[4rem] px-8 py-16 md:px-16 mt-12 relative overflow-hidden transition-colors duration-500 border-t border-surface">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
          <div>
            <div className="font-heading font-bold text-xl tracking-tight text-textPrimary mb-2">BALLARAT CLIMATE</div>
            <div className="font-data text-xs text-textMuted uppercase tracking-widest">BOM DATA AGGREGATION SYSTEM</div>
          </div>
          <div className="flex items-center gap-3 bg-surface px-4 py-2 rounded-full border border-white/5 transition-colors duration-500">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-data text-xs tracking-wider text-green-500/80">SYSTEM OPERATIONAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
