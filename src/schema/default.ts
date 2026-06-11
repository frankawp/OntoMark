import { OntologySchema } from './types';

export const DEFAULT_SCHEMA: OntologySchema = {
  version: '1.0',
  entity_types: {
    Concept: {
      description: '技术概念',
    },
    System: {
      description: '系统',
    },
    Component: {
      description: '组件',
    },
    ADR: {
      description: '架构决策',
    },
    Requirement: {
      description: '需求',
    },
    Incident: {
      description: '故障事件',
    },
    Team: {
      description: '团队',
    },
    Person: {
      description: '人员',
    },
    Project: {
      description: '项目',
    },
  },
  relations: {
    uses: {
      from: 'System',
      to: 'Concept',
    },
    implements: {
      from: 'Component',
      to: 'Concept',
    },
    owns: {
      from: 'Team',
      to: 'System',
    },
    affects: {
      from: 'Incident',
      to: 'System',
    },
  },
};