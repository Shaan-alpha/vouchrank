import { useState, useEffect } from 'react';
import {
  Sparkles, Star, Share2, Sliders, Settings, Eye, Building2,
  ArrowLeft, Target, Smartphone, LogOut, CreditCard,
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import * as api from './lib/api';

import Auth from './components/Auth';
import AioDashboard from './components/AioDashboard';
import ReviewList from './components/ReviewList';
import SocialGenerator from './components/SocialGenerator';
import BrandingSettings from './components/BrandingSettings';
import HarvesterFunnel from './components/HarvesterFunnel';
import WidgetsDemo from './components/WidgetsDemo';
import CompetitorBattleboard from './components/CompetitorBattleboard';
import Campaigns from './components/Campaigns';
import Billing from './components/Billing';
import FirstLocation from './components/FirstLocation';
import LocationsManager from './components/LocationsManager';

export default function App() {
  const [activeRole, setActiveRole] = useState('Agency');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auth (only enforced when Supabase is configured)
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);

  // Data
  const [companies, setCompanies] = useState([]);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [companyAudit, setCompanyAudit] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [campaignData, setCampaignData] = useState(null);
  const [agency, setAgency] = useState(null);
  const [showLocationsModal, setShowLocationsModal] = useState(false);

  // --- Auth wiring ---
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- Load companies once authed (or immediately in demo mode) ---
  useEffect(() => {
    if (isSupabaseConfigured && !session) return;
    api.getCompanies().then((list) => {
      setCompanies(list);
      setSelectedCompany((prev) => prev || list[0] || null);
      setCompaniesLoaded(true);
    });
    api.getAgency().then(setAgency).catch(() => {});
  }, [session]);

  // --- Load per-location data when the selected company changes ---
  useEffect(() => {
    if (!selectedCompany) return;
    const id = selectedCompany.id;
    Promise.all([
      api.getReviews(id),
      api.getAudit(id),
      api.getCompetitors(id),
      api.getCampaigns(id),
    ]).then(([rv, audit, comp, camp]) => {
      setReviews(rv);
      setCompanyAudit(audit);
      setCompetitors(comp);
      setCampaignData(camp);
    });
    document.documentElement.style.setProperty('--agency-primary', selectedCompany.colors?.primary || '#8b5cf6');
    document.documentElement.style.setProperty('--agency-secondary', selectedCompany.colors?.secondary || '#06b6d4');
  }, [selectedCompany]);

  // --- Handlers ---
  const handleToggleChecklist = (companyId, itemId) => {
    setCompanyAudit((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklist: prev.checklist.map((it) =>
          it.id === itemId ? { ...it, checked: !it.checked } : it
        ),
      };
    });
    const item = companyAudit?.checklist.find((i) => i.id === itemId);
    if (item) api.toggleChecklistItem(itemId, !item.checked).catch(() => {});
  };

  const handleAddReviewReply = (reviewId, replyText) => {
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, aiReply: replyText } : r)));
    api.saveReviewReply(reviewId, replyText).catch(() => {});
  };

  // Funnel submissions: optimistic local insert + persist via Edge Function.
  const handleAddReview = (newReview) => {
    const reviewWithId = { ...newReview, id: `r-gen-${Date.now()}` };
    setReviews((prev) => [reviewWithId, ...prev]);
    api.submitPublicReview({ ...newReview, locationId: selectedCompany?.id }).catch(() => {});
  };

  const handleRunAudit = async () => {
    await api.runAioAudit(selectedCompany.id);
    if (!api.demoMode) {
      const audit = await api.getAudit(selectedCompany.id);
      setCompanyAudit(audit);
    }
  };

  const handleUpdateCompany = (updatedCompany) => {
    setCompanies((prev) => prev.map((c) => (c.id === updatedCompany.id ? updatedCompany : c)));
    setSelectedCompany(updatedCompany);
  };

  // Clears stale per-location data so keyed children remount fresh once the
  // newly selected (or created) location loads.
  const clearTenantData = () => {
    setReviews([]);
    setCompanyAudit(null);
    setCompetitors([]);
    setCampaignData(null);
  };

  const handleCompanyChange = (e) => {
    const comp = companies.find((c) => c.id === e.target.value);
    if (comp) {
      clearTenantData();
      setSelectedCompany(comp);
    }
  };

  const handleSelectLocation = (id) => {
    const comp = companies.find((c) => c.id === id);
    if (comp && comp.id !== selectedCompany?.id) {
      clearTenantData();
      setSelectedCompany(comp);
    }
  };

  const handleSignOut = () => supabase?.auth.signOut();

  const handleCreateLocation = async ({ name, category }) => {
    const loc = await api.createLocation({ name, category });
    if (loc) {
      setCompanies([loc]);
      setSelectedCompany(loc);
    }
  };

  const handleAddLocation = async ({ name, category }) => {
    const loc = await api.createLocation({ name, category });
    if (!loc) return;
    setCompanies((prev) => [...prev, loc]);
    clearTenantData();
    setSelectedCompany(loc);
  };

  const handleUpdateLocation = async (id, fields) => {
    const ui = {};
    if (fields.name !== undefined) ui.name = fields.name;
    if (fields.category !== undefined) ui.category = fields.category;
    if (fields.domain !== undefined) ui.domain = fields.domain;
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...ui } : c)));
    setSelectedCompany((prev) => (prev && prev.id === id ? { ...prev, ...ui } : prev));
    await api.updateLocation(id, fields).catch(() => {});
  };

  const handleDeleteLocation = async (id) => {
    const next = companies.filter((c) => c.id !== id);
    setCompanies(next);
    if (selectedCompany && selectedCompany.id === id) {
      clearTenantData();
      setSelectedCompany(next[0] || null);
    }
    if (next.length === 0) setShowLocationsModal(false); // avoid re-opening over onboarding
    await api.deleteLocation(id).catch(() => {});
  };

  // --- Gates ---
  if (!authReady) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#030408', color: '#fff' }}>Loading…</div>;
  }
  if (isSupabaseConfigured && !session) return <Auth />;
  if (!selectedCompany) {
    if (companiesLoaded && companies.length === 0) {
      return <FirstLocation onCreate={handleCreateLocation} />;
    }
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#030408', color: '#fff' }}>Setting up your workspace…</div>;
  }

  return (
    <div id="root">
      {activeRole === 'Customer' ? (
        <div style={{ minHeight: '100vh', background: '#030408', position: 'relative', overflowY: 'auto', padding: '1px' }}>
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'rgba(139, 92, 246, 0.95)', color: '#fff', padding: '10px 20px', zIndex: 9999, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', backdropFilter: 'blur(5px)', fontSize: '13px', fontWeight: '500' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye style={{ width: '16px' }} />
              Previewing Branded Customer Funnel for <strong>{selectedCompany.name}</strong>
            </span>
            <button onClick={() => setActiveRole('Agency')} style={{ background: '#fff', color: 'var(--agency-primary)', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }} id="btn-return-to-dashboard">
              <ArrowLeft style={{ width: '12px' }} />
              Back to Dashboard
            </button>
          </div>

          <HarvesterFunnel company={selectedCompany} onAddReview={handleAddReview} />
        </div>
      ) : (
        <div className="app-container">
          <nav className="sidebar">
            <div className="logo-container">
              <div className="logo-icon">V</div>
              <div className="logo-text">VouchRank</div>
            </div>

            <ul className="nav-links">
              <li><div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} id="tab-btn-dashboard"><Sparkles /><span>AIO Dashboard</span></div></li>
              <li><div className={`nav-item ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')} id="tab-btn-reviews"><Star /><span>Review Harvester</span></div></li>
              <li><div className={`nav-item ${activeTab === 'competitors' ? 'active' : ''}`} onClick={() => setActiveTab('competitors')} id="tab-btn-competitors"><Target /><span>Competitor Battleboard</span></div></li>
              <li><div className={`nav-item ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')} id="tab-btn-social"><Share2 /><span>Social Generator</span></div></li>
              <li><div className={`nav-item ${activeTab === 'widgets' ? 'active' : ''}`} onClick={() => setActiveTab('widgets')} id="tab-btn-widgets"><Sliders /><span>Widgets Showcase</span></div></li>
              <li><div className={`nav-item ${activeTab === 'campaigns' ? 'active' : ''}`} onClick={() => setActiveTab('campaigns')} id="tab-btn-campaigns"><Smartphone /><span>Review Campaigns</span></div></li>
              <li><div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} id="tab-btn-settings"><Settings /><span>Branding Settings</span></div></li>
              <li><div className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`} onClick={() => setActiveTab('billing')} id="tab-btn-billing"><CreditCard /><span>Billing &amp; Plan</span></div></li>
            </ul>

            <div className="sidebar-footer">
              <div className="role-badge">Role: Agency Admin{api.demoMode ? ' (Demo)' : ''}</div>
              <button className="role-switcher-btn" onClick={() => setActiveRole('Customer')} id="btn-switch-to-funnel">
                <Eye style={{ width: '14px' }} />
                <span>Test Funnel View</span>
              </button>
              {isSupabaseConfigured && (
                <button className="role-switcher-btn" onClick={handleSignOut} style={{ marginTop: 8 }} id="btn-sign-out">
                  <LogOut style={{ width: '14px' }} />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          </nav>

          <main className="main-content">
            <div className="header-bar">
              <div className="welcome-section">
                <h1>
                  {activeTab === 'dashboard' && 'AI Search Visibility'}
                  {activeTab === 'reviews' && 'Reviews Manager'}
                  {activeTab === 'competitors' && 'Competitor SEO Battleboard'}
                  {activeTab === 'social' && 'Social Graphics Engine'}
                  {activeTab === 'widgets' && 'Embeddable Widgets'}
                  {activeTab === 'campaigns' && 'Review Request Campaigns'}
                  {activeTab === 'settings' && 'White-Label Branding'}
                  {activeTab === 'billing' && 'Billing & Subscription'}
                </h1>
                <p>
                  {activeTab === 'dashboard' && 'Optimize client presence for AI search citations.'}
                  {activeTab === 'reviews' && 'Moderate reviews and generate AI replies.'}
                  {activeTab === 'competitors' && 'Compare local review growth and AIO rating against rivals.'}
                  {activeTab === 'social' && 'Turn customer praise into marketing content.'}
                  {activeTab === 'widgets' && 'Integrate social proof widgets on client pages.'}
                  {activeTab === 'campaigns' && 'Send compliant SMS/Email review requests.'}
                  {activeTab === 'settings' && 'Set up domain routing and brand themes.'}
                  {activeTab === 'billing' && 'Manage your agency plan and payment.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 style={{ color: 'var(--text-secondary)', width: '18px' }} />
                <select className="tenant-selector" value={selectedCompany.id} onChange={handleCompanyChange} id="select-tenant-location">
                  {companies.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <button className="locations-icon-btn" onClick={() => setShowLocationsModal(true)} id="btn-manage-locations">
                  Manage
                </button>
              </div>
            </div>

            {activeTab === 'dashboard' && companyAudit && (
              <AioDashboard company={selectedCompany} auditData={companyAudit} onToggleChecklist={handleToggleChecklist} onRunAudit={handleRunAudit} />
            )}
            {activeTab === 'reviews' && (
              <ReviewList reviews={reviews} onAddReviewReply={handleAddReviewReply} />
            )}
            {activeTab === 'competitors' && (
              <CompetitorBattleboard company={selectedCompany} competitors={competitors} />
            )}
            {activeTab === 'social' && (
              <SocialGenerator reviews={reviews} company={selectedCompany} />
            )}
            {activeTab === 'widgets' && (
              <WidgetsDemo reviews={reviews} company={selectedCompany} />
            )}
            {activeTab === 'campaigns' && campaignData && (
              <Campaigns key={selectedCompany.id} company={selectedCompany} campaignData={campaignData} />
            )}
            {activeTab === 'settings' && (
              <BrandingSettings key={selectedCompany.id} company={selectedCompany} onUpdateCompany={handleUpdateCompany} />
            )}
            {activeTab === 'billing' && <Billing />}
          </main>

          {showLocationsModal && (
            <LocationsManager
              companies={companies}
              selectedId={selectedCompany.id}
              maxLocations={agency?.max_locations ?? 15}
              onAdd={handleAddLocation}
              onUpdate={handleUpdateLocation}
              onDelete={handleDeleteLocation}
              onSelect={handleSelectLocation}
              onClose={() => setShowLocationsModal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
