import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  SUPABASE_REST_URL,
  SUPABASE_ANON_KEY
} from './config';

const TABLE = 'readings';

const fallback = [
  { date: '2026-05-11', value: 94, notes: 'Fasting' },
  { date: '2026-05-12', value: 116, notes: 'Before breakfast' },
  { date: '2026-05-13', value: 142, notes: 'After lunch' },
];
