import { BoardDiagram } from './board-diagram';
import type { BoardDesignConfig, BoardMetrics } from '@/lib/board-designer/types';

export function BoardPreview(props: {
  config: BoardDesignConfig;
  metrics: BoardMetrics;
}) {
  return <BoardDiagram {...props} />;
}
