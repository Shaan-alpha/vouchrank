import { useState, useEffect } from 'react';
import { Settings, Save, Palette, Globe, Star, Link2 } from 'lucide-react';
import * as api from '../lib/api';

export default function BrandingSettings({ company, onUpdateCompany }) {
  const [name, setName] = useState(company.name);
  const [category, setCategory] = useState(company.category);
  const [domain, setDomain] = useState(company.domain);
  const [logoText, setLogoText] = useState(company.logoText);
  const [primaryColor, setPrimaryColor] = useState(company.colors?.primary || '#8b5cf6');
  const [secondaryColor, setSecondaryColor] = useState(company.colors?.secondary || '#06b6d4');
  
  const [isSaved, setIsSaved] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectNotice, setConnectNotice] = useState('');

  const handleConnectGoogle = async () => {
    setConnecting(true);
    setConnectNotice('');
    try {
      const res = await api.startGoogleOAuth(company.id);
      if (res?.demo) setConnectNotice(res.message);
    } catch (e) {
      setConnectNotice(e.message || 'Could not start Google connection.');
    } finally {
      setConnecting(false);
    }
  };

  // NOTE: this component is keyed by location id in App, so switching locations
  // remounts it and the useState initializers above pick up the new company —
  // no prop->state sync effect needed.

  // Real-time theme update effect
  useEffect(() => {
    // Convert hex to RGB values to update RGB variable
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result 
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '139, 92, 246';
    };

    document.documentElement.style.setProperty('--agency-primary', primaryColor);
    document.documentElement.style.setProperty('--agency-primary-rgb', hexToRgb(primaryColor));
    document.documentElement.style.setProperty('--agency-secondary', secondaryColor);
    document.documentElement.style.setProperty('--agency-secondary-rgb', hexToRgb(secondaryColor));
  }, [primaryColor, secondaryColor]);

  const handleSave = (e) => {
    e.preventDefault();
    onUpdateCompany({
      ...company,
      name,
      category,
      domain,
      logoText,
      colors: {
        primary: primaryColor,
        secondary: secondaryColor
      }
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <form className="settings-grid" onSubmit={handleSave}>
      {/* Left Column: Form Settings */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings style={{ color: 'var(--agency-primary)', width: '18px' }} />
          White-Label Configurations
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '24px' }}>
          Customize details for this business location. Adjust themes to match their official brand guidelines.
        </p>

        {/* Company Name */}
        <div className="input-field-group">
          <label>Location / Business Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="input-control"
            required
            id="input-settings-name"
          />
        </div>

        {/* Category */}
        <div className="input-field-group">
          <label>Business Category</label>
          <input 
            type="text" 
            value={category} 
            onChange={(e) => setCategory(e.target.value)} 
            className="input-control"
            required
            id="input-settings-category"
          />
        </div>

        {/* White label domain & logo badge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="input-field-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe style={{ width: '14px' }} /> Custom Domain
            </label>
            <input 
              type="text" 
              value={domain} 
              onChange={(e) => setDomain(e.target.value)} 
              className="input-control"
              placeholder="reviews.company.com"
              id="input-settings-domain"
            />
          </div>

          <div className="input-field-group">
            <label>Logo Text Badge</label>
            <input 
              type="text" 
              value={logoText} 
              maxLength="3"
              onChange={(e) => setLogoText(e.target.value)} 
              className="input-control"
              placeholder="EX"
              id="input-settings-logotext"
            />
          </div>
        </div>

        {/* Google Business Profile connection */}
        <div className="input-field-group" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Link2 style={{ width: '14px' }} /> Google Business Profile
          </label>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 10px' }}>
            Connect this location to sync Google reviews and reply on the client's behalf
            (records written consent, as Google requires).
          </p>
          <button
            type="button"
            className="btn-sm-action"
            onClick={handleConnectGoogle}
            disabled={connecting}
            id="btn-connect-google"
          >
            {connecting ? 'Connecting…' : 'Connect Google Business Profile'}
          </button>
          {connectNotice && (
            <p style={{ fontSize: '11px', color: 'var(--agency-secondary)', marginTop: '8px' }}>{connectNotice}</p>
          )}
        </div>

        {/* Color Palette Designer */}
        <div className="control-group" style={{ marginTop: '10px', marginBottom: '24px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            <Palette style={{ width: '14px' }} /> Brand Theme Colors
          </label>
          
          <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
            <div className="color-picker-row">
              <div className="color-input-preview" style={{ background: primaryColor }}>
                <input 
                  type="color" 
                  value={primaryColor} 
                  onChange={(e) => setPrimaryColor(e.target.value)} 
                  id="color-picker-primary"
                />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>Primary Hex</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{primaryColor.toUpperCase()}</div>
              </div>
            </div>

            <div className="color-picker-row">
              <div className="color-input-preview" style={{ background: secondaryColor }}>
                <input 
                  type="color" 
                  value={secondaryColor} 
                  onChange={(e) => setSecondaryColor(e.target.value)} 
                  id="color-picker-secondary"
                />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600' }}>Secondary Hex</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{secondaryColor.toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary-action" style={{ width: '100%' }} id="btn-save-branding-settings">
          <Save style={{ width: '18px' }} />
          {isSaved ? 'Settings Saved Successfully!' : 'Save Branding Changes'}
        </button>
      </div>

      {/* Right Column: Mini Branded Harvester Preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h3 style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
          Mobile Funnel Live Preview
        </h3>
        
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px', background: '#07080c' }}>
          {/* Phone Frame Simulator */}
          <div style={{ width: '280px', background: '#0e1017', borderRadius: '32px', border: '8px solid #1f2231', overflow: 'hidden', boxShadow: '0 20px 45px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Phone Speaker & Camera Notch */}
            <div style={{ width: '120px', height: '18px', background: '#1f2231', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '40px', height: '3px', background: '#0c0d13', borderRadius: '10px', marginTop: '4px' }}></div>
            </div>

            {/* Funnel Content Simulator */}
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px', flexGrow: 1, minHeight: '340px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '28px', height: '28px', background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`, borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifycontent: 'center', lineHeight: '28px', textAlign: 'center' }}>
                  {logoText}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff' }}>{name}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{category}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#fff', marginBottom: '10px' }}>How would you rate our services?</div>
                
                {/* Visual Stars */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '10px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} style={{ width: '16px', height: '16px', fill: '#fbbf24', color: '#fbbf24' }} />
                  ))}
                </div>

                <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Your feedback directly helps us improve!</div>
                
                {/* Branded Buttons Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ background: primaryColor, color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'center', boxShadow: `0 0 10px rgba(var(--agency-primary-rgb), 0.2)` }}>
                    Record Video Testimonial
                  </div>
                  <div style={{ background: 'transparent', border: `1px solid ${primaryColor}`, color: primaryColor, fontSize: '9px', fontWeight: 'bold', padding: '8px', borderRadius: '6px', cursor: 'pointer', textAlign: 'center' }}>
                    Post Review to Google
                  </div>
                </div>
              </div>
            </div>
            
            {/* Phone Home Bar */}
            <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '80px', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px' }}></div>
            </div>

          </div>
        </div>
      </div>
    </form>
  );
}
