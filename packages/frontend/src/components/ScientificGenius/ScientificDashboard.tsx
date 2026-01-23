import React, { useState } from 'react'
import { KnowledgeGraph } from './KnowledgeGraph'
import { getLogger } from '@deltachat-desktop/shared/logger'

const log = getLogger('frontend/components/ScientificGenius/ScientificDashboard')

export const ScientificDashboard: React.FC = () => {
    const [input, setInput] = useState('')

    // Manual input for testing
    // Syntax: A -> B (creates InheritanceLink)
    const handleInput = async (e: React.FormEvent) => {
        e.preventDefault()
        const executor = (window as any).deepTreeEchoExecutor
        if (!executor) return

        if (input.includes('->')) {
            const [source, target] = input.split('->').map(s => s.trim())
            if (source && target) {
                // Manually trigger the tool
                await executor.executeTool({
                    name: 'store_knowledge',
                    input: {
                        type: 'InheritanceLink',
                        outgoing: [source, target],
                        confidence: 1.0
                    }
                }, 0) // Account ID 0 for system
            }
        } else {
            await executor.executeTool({
                name: 'store_knowledge',
                input: {
                    type: 'ConceptNode',
                    name: input.trim(),
                    confidence: 1.0
                }
            }, 0)
        }
        setInput('')
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'white', background: '#0d1117' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #30363d' }}>
                <h2 style={{ margin: 0 }}>🧠 Scientific Cortex</h2>
                <p style={{ margin: '5px 0 0', opacity: 0.7 }}>Visualizing the AtomSpace Knowledge Graph</p>
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
                <KnowledgeGraph />
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #30363d', background: '#161b22' }}>
                <form onSubmit={handleInput} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Omnibar: Enter 'Entity' or 'Entity A -> Entity B' to teach..."
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid #30363d',
                            background: '#0d1117',
                            color: 'white'
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#238636',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Inject Knowledge
                    </button>
                </form>
            </div>
        </div>
    )
}
