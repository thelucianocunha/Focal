/*  Focal — Task Management App
 *  Copyright (c) 2026 Luciano Cunha. All rights reserved.
 *  License: CC BY-NC 4.0
 *  https://creativecommons.org/licenses/by-nc/4.0/
 *
 *  This is the public starter data file.
 *  Copy this to Focal_data.js and customize it for your setup.
 *  Focal_data.js is listed in .gitignore — your personal data stays private.
 */

// ═══ APP META ═══
const VER   = '10.3.0';
const VDATE = 'May 17, 2026';

// ═══ FILE_DATA — edit this to set up your personal Focal ═══
const FILE_DATA = {
  version: VER, updated: '2026-05-17',
  inbox: [],

  // People and companies you work with — used for task connections and filtering
  knownConnections: [],

  // Named groups for bulk filtering (e.g. "Leadership Team" = [Alice, Bob, Carol])
  personGroups: [],

  // Strategic outcomes — the goals your tasks contribute to
  // Customize names and colors to match your priorities
  outcomes: [
    { id: 'revenue',  name: 'Revenue Growth',    color: '#059669', active: true, sort: 0 },
    { id: 'cx',       name: 'Customer Success',  color: '#2563EB', active: true, sort: 1 },
    { id: 'ops',      name: 'Operations',        color: '#D97706', active: true, sort: 2 },
    { id: 'people',   name: 'Leadership/People', color: '#7C3AED', active: true, sort: 3 },
    { id: 'strategy', name: 'Strategic Projects',color: '#00B5B0', active: true, sort: 4 },
  ],

  // Sections — top-level groupings for your tasks
  // Customize titles, icons, and add your own sections in Settings
  sections: [
    { id: 'priorities', icon: '🎯', title: 'Monthly Priorities', tasks: [
      { id: 'welcome', priority: 'P2', task: 'Welcome to Focal — edit or delete this task to get started',
        status: 'To Do', due: '', note: 'Open Settings (⚙️) to set up your sections, outcomes, and people. Press ? for keyboard shortcuts.',
        type: 'once', urgent: 0, confidential: false, connections: [], kanbanCol: null, outcomes: [] },
    ]},
    { id: 'team',       icon: '👥', title: 'Team / People',       tasks: [] },
    { id: 'personal',   icon: '✅', title: 'Personal',            tasks: [] },
  ]
};
