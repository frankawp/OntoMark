import { OntologySchema } from './types';

export const DEFAULT_SCHEMA: OntologySchema = {
  version: '1.0',
  entity_types: {
    Topic: {
      description: '主题页/知识地图',
    },
    Concept: {
      description: '概念',
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
    Tool: {
      description: '工具',
    },
  },
  relations: {},
};
