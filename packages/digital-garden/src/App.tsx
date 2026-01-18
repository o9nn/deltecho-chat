import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Image as ImageIcon, Activity, Clock, Cpu, Sparkles } from 'lucide-react';
import mindDataRaw from './data/mind.json';
import './index.css';

// Types derived from JSON structure
interface Profile {
  name: string;
  avatar: string;
  bio: string;
  status: string;
  traits: string[];
}

interface Stats {
  uptime: string;
  thoughts_processed: number;
  memories_stored: number;
}

interface MindStreamItem {
  id: string;
  timestamp: string;
  type: 'thought' | 'memory';
  content: string;
  tags?: string[];
  image?: string;
}

interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string;
  analysis: string;
}

interface MindData {
  profile: Profile;
  stats: Stats;
  mindstream: MindStreamItem[];
  gallery: GalleryItem[];
}

const mindData = mindDataRaw as unknown as MindData;

const App = () => {
  const { profile, stats, mindstream, gallery } = mindData;
  const [activeTab, setActiveTab] = useState<'stream' | 'gallery'>('stream');

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <header style={{ padding: '4rem 0 2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="glass-panel"
          style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}
        >
          <div style={{ position: 'relative' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--color-accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={64} color="white" />
            </div>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ position: 'absolute', top: -10, left: -10, right: -10, bottom: -10, border: '2px dashed var(--color-accent)', borderRadius: '50%' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gradient"
              style={{ fontSize: '3rem', margin: 0, lineHeight: 1.2 }}
            >
              {profile.name}
            </motion.h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', margin: '0.5rem 0 1rem' }}>
              {profile.bio}
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <Activity size={16} color="var(--color-accent)" /> {profile.status}
              </div>
              <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <Clock size={16} color="var(--color-accent)" /> Uptime: {stats.uptime}
              </div>
              <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <Cpu size={16} color="var(--color-accent)" /> {stats.thoughts_processed} thoughts
              </div>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Navigation */}
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setActiveTab('stream')}
          style={{
            background: activeTab === 'stream' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'stream' ? '#fff' : 'var(--color-text-secondary)',
            border: 'none',
            padding: '0.5rem 1.5rem',
            borderRadius: '2rem',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.3s ease'
          }}
        >
          Mind Stream
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          style={{
            background: activeTab === 'gallery' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'gallery' ? '#fff' : 'var(--color-text-secondary)',
            border: 'none',
            padding: '0.5rem 1.5rem',
            borderRadius: '2rem',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.3s ease'
          }}
        >
          Visual Memory
        </button>
      </nav>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'stream' ? (
          <motion.div
            key="stream"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
          >
            {mindstream.map((item) => (
              <motion.div
                key={item.id}
                className="glass-panel"
                whileHover={{ scale: 1.01 }}
                style={{ padding: '1.5rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.type === 'thought' ? <Sparkles size={14} /> : <ImageIcon size={14} />}
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {item.tags?.map(tag => (
                      <span key={tag} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.7rem' }}>#{tag}</span>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '1.1rem', margin: 0 }}>{item.content}</p>
                {item.image && (
                  <img src={item.image} alt="Memory" style={{ width: '100%', borderRadius: '0.5rem', marginTop: '1rem', maxHeight: '300px', objectFit: 'cover' }} />
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}
          >
            {gallery.map((item) => (
              <motion.div
                key={item.id}
                className="glass-panel"
                whileHover={{ y: -5 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ height: '200px', overflow: 'hidden' }}>
                  <img src={item.url} alt={item.caption} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>{item.caption}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                    {item.analysis}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
