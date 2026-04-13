import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, BarChart3, UploadCloud, LayoutTemplate } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ padding: '40px 0', maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
      
      {/* Hero Section */}
      <div style={{ marginBottom: 80 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(99,102,241,0.1)', color: 'var(--text-accent)', borderRadius: 100, fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          <Sparkles size={16} /> DataVision AI 2.0 is out
        </div>
        
        <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-1px' }}>
          Turn raw data into <br/>
          <span className="gradient-text">beautiful dashboards</span> in seconds.
        </h1>
        
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Upload your CSV, Excel, or JSON files. Our AI automatically analyzes your schema, detects trends, and generates customizable, interactive charts instantly.
        </p>
        
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/upload')} style={{ padding: '16px 32px' }}>
            Start for free <ArrowRight size={18} />
          </button>
          <button className="btn btn-secondary btn-lg" style={{ padding: '16px 32px' }}>
            View Demo
          </button>
        </div>
      </div>

      {/* Feature grid */}
      <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, textAlign: 'left' }}>How it works</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, textAlign: 'left' }}>
        
        <div className="card glass-bright">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <UploadCloud size={24} color="var(--accent-primary)" />
          </div>
          <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>1. Drop your data</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Securely upload your datasets. We support CSV, Excel, and JSON formats up to 50MB per file.</p>
        </div>

        <div className="card glass-bright">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Sparkles size={24} color="var(--accent-cyan)" />
          </div>
          <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>2. AI Analysis</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Our engine detects data types, maps relationships, finds outliers, and writes summary insights.</p>
        </div>

        <div className="card glass-bright">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <BarChart3 size={24} color="var(--accent-emerald)" />
          </div>
          <h4 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>3. Instant Dashboard</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Review your auto-generated charts. Drag, drop, edit, or customize them, and export to share.</p>
        </div>

      </div>
    </div>
  );
}
