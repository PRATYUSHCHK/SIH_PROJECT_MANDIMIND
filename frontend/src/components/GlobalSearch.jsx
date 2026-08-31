import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  Package,
  ShoppingCart,
  Receipt,
  Truck,
  Zap,
  Bell,
  Compass,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useTranslation } from '../i18n/index.jsx';

const RECENT_KEY = 'mm_recent_searches';

export function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [data, setData] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_KEY)) || ['Tomato', 'Ravi Reddy', 'Hyderabad Fresh Foods', '500 kg'];
    } catch {
      return ['Tomato', 'Ravi Reddy', 'Hyderabad', '500 kg'];
    }
  });

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const saveRecentSearch = useCallback((term) => {
    if (!term || term.trim().length < 2) return;
    const clean = term.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  }, []);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(false);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setData(res.data);
      setSelectedIndex(-1);
    } catch (e) {
      setErr(true);
      setData(null);
    }
    setLoading(false);
  }, []);

  // Debounced input change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 2) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 300);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flatten searchable results for keyboard navigation
  const flatResults = React.useMemo(() => {
    if (!data) return [];
    const list = [];
    if (data.pages?.length) {
      data.pages.forEach((p) => list.push({ type: 'page', item: p, url: p.path }));
    }
    if (data.listings?.length) {
      data.listings.forEach((l) => list.push({ type: 'listing', item: l, url: '/marketplace' }));
    }
    if (data.requirements?.length) {
      data.requirements.forEach((r) => list.push({ type: 'requirement', item: r, url: '/marketplace' }));
    }
    if (data.transactions?.length) {
      data.transactions.forEach((tx) => list.push({ type: 'transaction', item: tx, url: '/transactions' }));
    }
    if (data.matches?.length) {
      data.matches.forEach((m) => list.push({ type: 'match', item: m, url: '/matches' }));
    }
    if (data.logistics?.length) {
      data.logistics.forEach((log) => list.push({ type: 'logistics', item: log, url: `/logistics?transactionId=${log._id}` }));
    }
    if (data.alerts?.length) {
      data.alerts.forEach((a) => list.push({ type: 'alert', item: a, url: '/alerts' }));
    }
    return list;
  }, [data]);

  const handleSelectResult = (result) => {
    saveRecentSearch(query);
    setIsOpen(false);
    if (result.url) {
      navigate(result.url);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && flatResults[selectedIndex]) {
        handleSelectResult(flatResults[selectedIndex]);
      } else if (flatResults.length > 0) {
        handleSelectResult(flatResults[0]);
      } else if (query.trim().length >= 2) {
        saveRecentSearch(query);
        setIsOpen(false);
        navigate('/marketplace');
      }
    }
  };

  const clearQuery = () => {
    setQuery('');
    setData(null);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const hasResults = flatResults.length > 0;
  const isSearchActive = query.trim().length >= 2;

  let currentGlobalIdx = 0;

  return (
    <div className="relative flex-1 max-w-2xl" ref={containerRef}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          aria-label={t('common.search', 'Search')}
          placeholder={t('common.search', 'Search commodities, mandis, orders, people, alerts...')}
          className="w-full rounded-full border border-line bg-canvas py-2 pl-10 pr-9 text-sm transition-all focus:border-forest focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 dark:border-night-mute/20 dark:bg-night-lift dark:focus:border-harvest dark:focus:bg-night-card dark:focus:ring-harvest/20"
        />
        {loading ? (
          <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-forest dark:text-harvest" />
        ) : query ? (
          <button
            type="button"
            onClick={clearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-mute hover:bg-earth hover:text-ink dark:hover:bg-night-lift"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {/* Global Search Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 max-h-[75vh] overflow-y-auto rounded-2xl border border-line bg-white shadow-2xl backdrop-blur-md dark:border-night-mute/20 dark:bg-night-card z-50 divide-y divide-line/60 dark:divide-night-mute/20">
          {/* Recent searches & Suggestions when input < 2 characters */}
          {!isSearchActive && (
            <div className="p-4 space-y-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-mute flex items-center gap-1.5">
                <Sparkles size={12} className="text-forest dark:text-harvest" />
                <span>Popular & Recent Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      performSearch(term);
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-line bg-earth/40 px-3 py-1.5 text-xs font-semibold text-ink hover:border-forest/40 hover:bg-forest/10 hover:text-forest transition-colors dark:border-night-mute/20 dark:bg-night-lift dark:text-night-text dark:hover:text-harvest"
                  >
                    <Search size={11} className="text-mute" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-mute pt-1">
                Type at least 2 characters to search across live listings, buyer requirements, transactions, routes & AI matches.
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-6 text-center text-sm text-mute flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-forest dark:text-harvest" />
              <span>Searching MandiMind database for "{query}"...</span>
            </div>
          )}

          {/* Error State */}
          {err && !loading && (
            <div className="p-6 text-center text-sm text-alert flex flex-col items-center gap-2">
              <AlertCircle size={20} />
              <span>Search temporarily unavailable. Please retry.</span>
            </div>
          )}

          {/* No Results Found */}
          {!loading && !err && isSearchActive && !hasResults && (
            <div className="p-6 text-center space-y-3">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-earth text-mute dark:bg-night-lift">
                <Search size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-ink dark:text-night-text">No results found for "{query}"</div>
                <div className="text-xs text-mute mt-1">Try searching for:</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left max-w-sm mx-auto text-xs text-mute bg-earth/30 p-3 rounded-xl dark:bg-night-lift/40">
                <div>• <strong>Commodities:</strong> Tomato, Spinach, Onion</div>
                <div>• <strong>Locations:</strong> Hyderabad, Nalgonda</div>
                <div>• <strong>People:</strong> Ravi Reddy, Fresh Foods</div>
                <div>• <strong>Quantities:</strong> 500 kg, ₹29/kg</div>
              </div>
            </div>
          )}

          {/* Results Sections */}
          {!loading && !err && hasResults && (
            <div>
              {/* 1. PAGES SECTION */}
              {data.pages && data.pages.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mute flex items-center gap-1">
                    <Compass size={11} className="text-forest dark:text-harvest" />
                    <span>{t('common.details', 'Pages')} ({data.pages.length})</span>
                  </div>
                  <div className="space-y-1">
                    {data.pages.map((p) => {
                      const idx = currentGlobalIdx++;
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => handleSelectResult({ type: 'page', item: p, url: p.path })}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest'
                              : 'hover:bg-earth dark:hover:bg-night-lift text-ink dark:text-night-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-7 w-7 place-items-center rounded-lg bg-forest/10 text-forest dark:bg-harvest/20 dark:text-harvest">
                              <Compass size={14} />
                            </div>
                            <div>
                              <div className="text-xs font-bold">{p.label}</div>
                              <div className="text-[11px] text-mute">{p.desc}</div>
                            </div>
                          </div>
                          <ArrowRight size={13} className="text-mute" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. PRODUCE LISTINGS */}
              {data.listings && data.listings.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mute flex items-center gap-1">
                    <Package size={11} className="text-forest dark:text-harvest" />
                    <span>{t('marketplace.produceListings', 'Produce Listings')} ({data.counts?.listings || data.listings.length})</span>
                  </div>
                  <div className="space-y-1">
                    {data.listings.map((item) => {
                      const idx = currentGlobalIdx++;
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => handleSelectResult({ type: 'listing', item, url: '/marketplace' })}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest'
                              : 'hover:bg-earth dark:hover:bg-night-lift text-ink dark:text-night-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/15 text-forest font-bold dark:bg-harvest/20 dark:text-harvest">
                              <Package size={15} />
                            </div>
                            <div>
                              <div className="text-xs font-bold">
                                {item.commodityName} — {item.quantityKg} kg
                              </div>
                              <div className="text-[11px] text-mute flex items-center gap-1.5">
                                <span>{item.farmer?.name || 'Farmer'}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5"><MapPin size={10} />{item.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-forest dark:text-harvest">₹{item.expectedPriceInr}/kg</div>
                            <span className="text-[10px] font-extrabold uppercase rounded px-1.5 py-0.5 bg-earth text-mute dark:bg-night-lift">
                              Grade {item.qualityGrade}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. BUYER REQUIREMENTS */}
              {data.requirements && data.requirements.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mute flex items-center gap-1">
                    <ShoppingCart size={11} className="text-forest dark:text-harvest" />
                    <span>{t('marketplace.buyerRequirements', 'Buyer Requirements')} ({data.counts?.requirements || data.requirements.length})</span>
                  </div>
                  <div className="space-y-1">
                    {data.requirements.map((item) => {
                      const idx = currentGlobalIdx++;
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => handleSelectResult({ type: 'requirement', item, url: '/marketplace' })}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest'
                              : 'hover:bg-earth dark:hover:bg-night-lift text-ink dark:text-night-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-info/15 text-info font-bold">
                              <ShoppingCart size={15} />
                            </div>
                            <div>
                              <div className="text-xs font-bold">
                                {item.commodityName} — {item.quantityKg} kg
                              </div>
                              <div className="text-[11px] text-mute flex items-center gap-1.5">
                                <span>{item.buyer?.name || 'Buyer'}</span>
                                <span>•</span>
                                <span className="flex items-center gap-0.5"><MapPin size={10} />{item.deliveryLocation}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-info">Max ₹{item.maximumPriceInr}/kg</div>
                            <span className="text-[10px] uppercase font-bold text-mute">Grade {item.qualityGrade}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. TRANSACTIONS */}
              {data.transactions && data.transactions.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mute flex items-center gap-1">
                    <Receipt size={11} className="text-forest dark:text-harvest" />
                    <span>{t('nav.transactions', 'Transactions')} ({data.counts?.transactions || data.transactions.length})</span>
                  </div>
                  <div className="space-y-1">
                    {data.transactions.map((tx) => {
                      const idx = currentGlobalIdx++;
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={tx._id}
                          type="button"
                          onClick={() => handleSelectResult({ type: 'transaction', item: tx, url: '/transactions' })}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest'
                              : 'hover:bg-earth dark:hover:bg-night-lift text-ink dark:text-night-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-harvest/15 text-harvest font-bold">
                              <Receipt size={15} />
                            </div>
                            <div>
                              <div className="text-xs font-bold">
                                {tx.commodityName} — {tx.quantityKg} kg
                              </div>
                              <div className="text-[11px] text-mute">
                                {tx.farmer?.name || 'Supplier'} → {tx.buyer?.name || 'Buyer'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-extrabold text-forest dark:text-harvest">₹{tx.totalValueInr?.toLocaleString('en-IN')}</div>
                            <span className="text-[10px] font-extrabold uppercase rounded px-1.5 py-0.5 bg-earth text-mute dark:bg-night-lift">
                              {t(`transactions.${tx.status}`, tx.status?.replace('_', ' '))}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 5. AI MATCHES */}
              {data.matches && data.matches.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mute flex items-center gap-1">
                    <Zap size={11} className="text-forest dark:text-harvest" />
                    <span>{t('nav.matches', 'AI Matches')} ({data.counts?.matches || data.matches.length})</span>
                  </div>
                  <div className="space-y-1">
                    {data.matches.map((m) => {
                      const idx = currentGlobalIdx++;
                      const isSelected = selectedIndex === idx;
                      const cName = m.listing?.commodityName || m.requirement?.commodityName || 'Produce';
                      const qKg = m.listing?.quantityKg || m.requirement?.quantityKg || 0;
                      return (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => handleSelectResult({ type: 'match', item: m, url: '/matches' })}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest'
                              : 'hover:bg-earth dark:hover:bg-night-lift text-ink dark:text-night-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-forest/15 text-forest font-bold dark:bg-harvest/20 dark:text-harvest">
                              <Zap size={15} />
                            </div>
                            <div>
                              <div className="text-xs font-bold">
                                {cName} — {qKg} kg
                              </div>
                              <div className="text-[11px] text-mute">
                                {m.listing?.farmer?.name || 'Farmer'} ↔ {m.requirement?.buyer?.name || 'Buyer'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-forest dark:text-harvest">{m.matchScore}% {t('matches.matchScore', 'Match')}</div>
                            <span className="text-[10px] font-bold text-mute">₹{m.aiFairPriceInr}/kg</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6. LOGISTICS */}
              {data.logistics && data.logistics.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mute flex items-center gap-1">
                    <Truck size={11} className="text-forest dark:text-harvest" />
                    <span>{t('nav.logistics', 'Logistics Routes')} ({data.counts?.logistics || data.logistics.length})</span>
                  </div>
                  <div className="space-y-1">
                    {data.logistics.map((log) => {
                      const idx = currentGlobalIdx++;
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={log._id}
                          type="button"
                          onClick={() => handleSelectResult({ type: 'logistics', item: log, url: `/logistics?transactionId=${log._id}` })}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest'
                              : 'hover:bg-earth dark:hover:bg-night-lift text-ink dark:text-night-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-info/15 text-info font-bold">
                              <Truck size={15} />
                            </div>
                            <div>
                              <div className="text-xs font-bold">
                                {log.commodityName} — {log.quantityKg} kg
                              </div>
                              <div className="text-[11px] text-mute">
                                {log.logistics?.pickupLocation || 'Pickup'} → {log.logistics?.deliveryLocation || 'Destination'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-bold text-info">{log.logistics?.distanceKm || 0} km</div>
                            <span className="text-[10px] font-bold text-mute">₹{log.logistics?.transportCostInr || 0}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. ALERTS */}
              {data.alerts && data.alerts.length > 0 && (
                <div className="p-2">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-mute flex items-center gap-1">
                    <Bell size={11} className="text-forest dark:text-harvest" />
                    <span>{t('nav.alerts', 'Market Alerts')} ({data.alerts.length})</span>
                  </div>
                  <div className="space-y-1">
                    {data.alerts.map((a) => {
                      const idx = currentGlobalIdx++;
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={a._id}
                          type="button"
                          onClick={() => handleSelectResult({ type: 'alert', item: a, url: '/alerts' })}
                          className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                            isSelected
                              ? 'bg-forest/10 text-forest dark:bg-harvest/15 dark:text-harvest'
                              : 'hover:bg-earth dark:hover:bg-night-lift text-ink dark:text-night-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-lg bg-alert/15 text-alert font-bold">
                              <Bell size={15} />
                            </div>
                            <div>
                              <div className="text-xs font-bold">{a.title}</div>
                              <div className="text-[11px] text-mute line-clamp-1">{a.body}</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold uppercase rounded px-1.5 py-0.5 bg-alert/10 text-alert">
                            {a.severity}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer "View in Marketplace" */}
              <div className="p-2 bg-earth/40 dark:bg-night-lift/30 border-t border-line/60 dark:border-night-mute/20 flex items-center justify-between text-xs">
                <span className="text-mute font-medium">
                  Found {data.totalCount || flatResults.length} total matches in database
                </span>
                <button
                  type="button"
                  onClick={() => {
                    saveRecentSearch(query);
                    setIsOpen(false);
                    navigate('/marketplace');
                  }}
                  className="flex items-center gap-1 font-bold text-forest dark:text-harvest hover:underline"
                >
                  <span>Explore in Marketplace</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
