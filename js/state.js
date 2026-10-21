// Hibi: Loads the saved data once every mode above is defined.
'use strict';
/* =========================================================
   Live state
   ========================================================= */
let S = load();
const UI = {open:{}};           // which <details> are open, survives re-renders
let Q = '';                      // exercise search
let NF = {name:'', how:'', muscles:[], cats:[], kind:''};   // new exercise form
let NS = {name:'', dose:''};     // new supplement form
let JD = null;                   // journal draft
let PH = [];                     // progress photos (IndexedDB)
