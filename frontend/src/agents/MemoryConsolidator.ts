import { MemoryNode, MemoryEdge, MarketEvent, HindsightRecord, AgentLog } from '../types';

export class MemoryConsolidator {
  public name = 'Memory Consolidator Agent';
  public role = 'Knowledge graph architect & memory indexer';

  public consolidate(
    event: MarketEvent,
    hindsightRecord: HindsightRecord | undefined,
    currentNodes: MemoryNode[],
    currentEdges: MemoryEdge[]
  ): {
    logs: Omit<AgentLog, 'id' | 'timestamp'>[];
    updatedNodes: MemoryNode[];
    updatedEdges: MemoryEdge[];
  } {
    const logs: Omit<AgentLog, 'id' | 'timestamp'>[] = [];
    
    logs.push({
      message: `[Memory Audit] Syncing memory buffers. Existing graph state: ${currentNodes.length} nodes, ${currentEdges.length} edges.`,
      type: 'info'
    });

    const updatedNodes = [...currentNodes];
    const updatedEdges = [...currentEdges];

    // 1. Create and link an Event Node
    const eventNodeId = `node-event-${event.id}`;
    const eventNodeExists = updatedNodes.some(n => n.id === eventNodeId);

    if (!eventNodeExists) {
      logs.push({
        message: `Consolidating memory: Creating Event Node for "${event.title}".`,
        type: 'process'
      });

      // Insert event node
      updatedNodes.push({
        id: eventNodeId,
        label: event.title,
        group: 'event',
        detail: `Market Event: ${event.content} Ingested on ${event.timestamp}.`,
        importance: 4,
        // Give it coordinates near the company it represents
        x: undefined, // Force layout will solve, or we seed in viewport center
        y: undefined
      });

      // Link event node to company node
      const companyNodeId = `co-${event.companyId}`;
      const edgeId = `edge-ev-${event.id}-co-${event.companyId}`;
      
      updatedEdges.push({
        id: edgeId,
        source: eventNodeId,
        target: companyNodeId,
        label: 'impacts',
        weight: Math.abs(event.valueChange) > 10 ? 4 : 2,
        type: 'impacts'
      });

      logs.push({
        message: `Indexed connection: [Event Node] --(impacts)--> [Company Node (${event.companyName})].`,
        type: 'success'
      });
    }

    // 2. If there is a hindsight lesson, create and link the Lesson Node
    if (hindsightRecord) {
      const lessonNodeId = `node-lesson-${hindsightRecord.id}`;
      const lessonNodeExists = updatedNodes.some(n => n.id === lessonNodeId);

      if (!lessonNodeExists) {
        logs.push({
          message: `Consolidating long-term hindsight: Creating Hindsight Lesson Node.`,
          type: 'process'
        });

        updatedNodes.push({
          id: lessonNodeId,
          label: `Hindsight: ${hindsightRecord.deviationValue.replace('_', ' ').toUpperCase()}`,
          group: 'hindsight_lesson',
          detail: `Deviation lesson learned: ${hindsightRecord.hindsightLesson}`,
          importance: 6
        });

        // Link Hindsight Lesson to Company Node
        const companyNodeId = `co-${hindsightRecord.companyId}`;
        updatedEdges.push({
          id: `edge-less-${hindsightRecord.id}-co-${hindsightRecord.companyId}`,
          source: lessonNodeId,
          target: companyNodeId,
          label: 'triggers',
          weight: hindsightRecord.severity === 'critical' ? 5 : 3,
          type: 'triggers'
        });

        // Link Event to Hindsight Lesson Node
        updatedEdges.push({
          id: `edge-less-${hindsightRecord.id}-ev-${event.id}`,
          source: eventNodeId,
          target: lessonNodeId,
          label: 'resolves',
          weight: 4,
          type: 'resolves'
        });

        // Identify company sector and link Hindsight Lesson to Sector Node
        const sectorNodeMap: Record<string, string> = {
          'nvda': 'sec-semi',
          'aapl': 'sec-consumer',
          'tsla': 'sec-auto',
          'msft': 'sec-software'
        };

        const sectorNodeId = sectorNodeMap[hindsightRecord.companyId];
        if (sectorNodeId && updatedNodes.some(n => n.id === sectorNodeId)) {
          updatedEdges.push({
            id: `edge-less-${hindsightRecord.id}-sec-${sectorNodeId}`,
            source: lessonNodeId,
            target: sectorNodeId,
            label: 'impacts',
            weight: 3,
            type: 'impacts'
          });

          logs.push({
            message: `Linked Hindsight Lesson to Sector [${sectorNodeId.replace('sec-', '').toUpperCase()}] for macro correlation.`,
            type: 'success'
          });
        }
      }
    }

    // Optional: Simulating memory consolidation - strengthen links if there are multiple interactions.
    logs.push({
      message: `Consolidation phase complete. Graph updated to: ${updatedNodes.length} nodes, ${updatedEdges.length} edges.`,
      type: 'success'
    });

    return {
      logs,
      updatedNodes,
      updatedEdges
    };
  }
}
