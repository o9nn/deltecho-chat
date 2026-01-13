// AINavigation.tsx - A magnificent navigation component for the AI Companion Neighborhood
import React from 'react'
import { Brain, Globe, Sparkles } from 'lucide-react'
import { Screens } from '../ScreenController'

type AINavigationProps = {
  currentScreen: Screens
  changeScreen: (screen: Screens) => void
}

const AINavigation: React.FC<AINavigationProps> = ({
  currentScreen,
  changeScreen,
}) => {
  const isActive = currentScreen === Screens.AINeighborhood

  return (
    <div className='ai-neighborhood-navigation'>
      <button
        className={`ai-neighborhood-button ${isActive ? 'active' : ''}`}
        onClick={() => changeScreen(Screens.AINeighborhood)}
        title='Enter AI Companion Neighborhood'
      >
        <div className='ai-button-icon-container'>
          <Brain size={24} className='ai-button-icon primary' />
          <Globe size={16} className='ai-button-icon secondary' />
          <Sparkles size={12} className='ai-button-icon tertiary' />
        </div>
        <span className='ai-button-text'>AI Neighborhood</span>
      </button>
    </div>
  )
}

// Add styles to document
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style')
  styleEl.textContent = `
    .ai-neighborhood-navigation {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 1000;
      transition: transform 0.3s ease;
    }

    .ai-neighborhood-button {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.15) 100%);
      border: 2px solid;
      border-image: linear-gradient(135deg, #3b82f6, #8b5cf6) 1;
      border-radius: 16px;
      color: #3b82f6;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
      backdrop-filter: blur(8px);
    }

    .ai-neighborhood-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.2);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.2) 100%);
    }

    .ai-neighborhood-button.active {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(139, 92, 246, 0.3) 100%);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3), inset 0 0 8px rgba(139, 92, 246, 0.2);
      color: #8b5cf6;
    }

    .ai-button-icon-container {
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .ai-button-icon {
      position: absolute;
      transition: all 0.3s ease;
    }

    .ai-button-icon.primary {
      z-index: 3;
      color: #3b82f6;
    }

    .ai-button-icon.secondary {
      z-index: 2;
      color: #8b5cf6;
      opacity: 0.7;
      transform: translate(8px, -8px);
    }

    .ai-button-icon.tertiary {
      z-index: 1;
      color: #ec4899;
      opacity: 0.5;
      transform: translate(-8px, 8px);
    }

    .ai-neighborhood-button:hover .ai-button-icon.primary {
      transform: scale(1.1);
    }

    .ai-neighborhood-button:hover .ai-button-icon.secondary {
      transform: translate(10px, -10px) rotate(15deg);
    }

    .ai-neighborhood-button:hover .ai-button-icon.tertiary {
      transform: translate(-10px, 10px) rotate(-15deg);
    }

    .ai-button-text {
      font-weight: 600;
    }

    /* Media query for smaller screens */
    @media (max-width: 768px) {
      .ai-neighborhood-navigation {
        bottom: 16px;
        right: 16px;
      }
      
      .ai-button-text {
        display: none;
      }
      
      .ai-neighborhood-button {
        padding: 12px;
        border-radius: 50%;
      }
      
      .ai-button-icon-container {
        margin: 0;
      }
    }
  `
  document.head.appendChild(styleEl)
}

export default AINavigation
