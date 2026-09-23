/* ============ STARTER PLAN — beginner PPL ============ */
function DEFAULT_PLAN(){ return {
 name:"Push / Pull / Legs",
 startedISO:new Date().toISOString().slice(0,10),
 days:[
  {id:"push",name:"Day 1",tag:"Push",av:"--a1",
   warm:"10 minutes: light cardio, then arm circles, band pull-aparts, and a light empty-bar set of your first lift.",
   items:[{ex:"bench",sets:3,reps:[12,10,8]},{ex:"ohp",sets:3,reps:[10,8,8]},{ex:"incline",sets:2,reps:[12,10]},
          {ex:"lateral",sets:2,reps:[12,12]},{ex:"pushdown",sets:3,reps:[12,10,10]}]},
  {id:"pull",name:"Day 2",tag:"Pull",av:"--a2",
   warm:"10 minutes: light cardio, then band pull-aparts, shoulder dislocates, and a light set of your first pull.",
   items:[{ex:"latpulldown",sets:3,reps:[12,10,8]},{ex:"bbrow",sets:3,reps:[10,8,8]},{ex:"cablerow",sets:2,reps:[12,10]},
          {ex:"facepull",sets:2,reps:[15,15]},{ex:"hammer",sets:3,reps:[12,10,10]}]},
  {id:"legs",name:"Day 3",tag:"Legs",av:"--a3",
   warm:"10 minutes: light cardio, then bodyweight squats, hip hinges, and a light set on your first lift.",
   items:[{ex:"squat",sets:3,reps:[10,8,8]},{ex:"rdl",sets:3,reps:[10,8,8]},{ex:"legpress",sets:2,reps:[12,10]},
          {ex:"legcurl",sets:2,reps:[12,12]},{ex:"calf",sets:2,reps:[15,15]}]}
 ]};
}
/* ============ PRESET — 3-day full body A/B/C ============
   Source of record: docs/full-body-plan.json. Rep targets are the top of each
   range there (3 × "6-8" -> [8,8,8]) because the app's progression rule is
   "all sets hit target -> add weight", i.e. double progression; the lower bound
   is where you land after the jump. Rest carries over per exercise. Pull-ups
   and dips are planned as their pulldown / fly equivalents (can't do either
   yet). The curl/pushdown superset is it.super on the curl. */
function FULL_BODY_PLAN(){ return {
 name:"3-Day Full Body",
 startedISO:new Date().toISOString().slice(0,10),
 days:[
  {id:"fbA",name:"Workout A",tag:"Full body",av:"--a1",
   warm:"10 minutes: light cardio, then bodyweight squats, arm circles, band pull-aparts, and an empty-bar set of squat and bench.",
   items:[{ex:"squat",sets:3,reps:[8,8,8],rest:150},{ex:"bench",sets:3,reps:[8,8,8],rest:150},
          {ex:"latpulldown",sets:3,reps:[10,10,10],rest:120},{ex:"dbshoulder",sets:2,reps:[10,10],rest:105},
          {ex:"rdl",sets:2,reps:[10,10],rest:105},{ex:"dbfly",sets:2,reps:[15,15],rest:75}]},
  {id:"fbB",name:"Workout B",tag:"Full body",av:"--a2",
   warm:"10 minutes: light cardio, then hip hinges, cat-cows, band pull-aparts, and two light build-up sets of deadlift.",
   items:[{ex:"deadlift",sets:3,reps:[6,6,6],rest:180},{ex:"incline",sets:3,reps:[10,10,10],rest:120},
          {ex:"cablerow",sets:3,reps:[10,10,10],rest:120},{ex:"legpress",sets:2,reps:[12,12],rest:90},
          {ex:"lateral",sets:2,reps:[15,15],rest:60},{ex:"dbcurl",sets:2,reps:[12,12],rest:45,super:true},
          {ex:"pushdown",sets:2,reps:[12,12],rest:45}]},
  {id:"fbC",name:"Workout C",tag:"Full body",av:"--a3",
   warm:"10 minutes: light cardio, then bodyweight squats, shoulder dislocates, and an empty-bar set of front squat and overhead press.",
   items:[{ex:"frontsquat",sets:3,reps:[10,10,10],rest:135},{ex:"ohp",sets:3,reps:[8,8,8],rest:150},
          {ex:"csrow",sets:3,reps:[10,10,10],rest:120},{ex:"legcurl",sets:2,reps:[12,12],rest:90},
          {ex:"dbfly",sets:2,reps:[12,12],rest:90},{ex:"calf",sets:3,reps:[15,15,15],rest:60}]}
 ]};
}
/* ============ PRESET — beginner full body, dumbbells + machines ============
   Same A/B/C shape as FULL_BODY_PLAN, with no barbell work: every lift is
   one that can be pushed close to failure without a spotter or a bail-out
   drill. Each day has two leg exercises (one quad-led, one hamstring-led),
   a push and a pull. C is the user's own 2026-09-23 session, unchanged.
   Deliberately absent: hip thrust and calf raise (no kit for them at the
   user's gym), face pulls (disliked), supersets (tried, disliked), and a
   third leg exercise on any day. Separate day ids from the other full-body
   preset so switching between them doesn't show one's in-progress sets on
   the other. */
function BEGINNER_PLAN(){ return {
 name:"Full Body Beginner",
 startedISO:new Date().toISOString().slice(0,10),
 days:[
  {id:"bgA",name:"Workout A",tag:"Full body",av:"--a1",
   warm:"10 minutes: light cardio, then bodyweight squats, arm circles, band pull-aparts, and a light set of goblet squat and dumbbell bench.",
   items:[{ex:"goblet",sets:3,reps:[10,10,10],rest:105},{ex:"dbbench",sets:3,reps:[10,10,10],rest:120},
          {ex:"latpulldown",sets:3,reps:[10,10,10],rest:105},{ex:"dbrdl",sets:3,reps:[10,10,10],rest:105},
          {ex:"dbcurl",sets:2,reps:[12,12],rest:60},{ex:"pushdown",sets:2,reps:[12,12],rest:60}]},
  {id:"bgB",name:"Workout B",tag:"Full body",av:"--a2",
   warm:"10 minutes: light cardio, then hip hinges, arm circles, band pull-aparts, and a light build-up set on the leg press.",
   items:[{ex:"legpress",sets:3,reps:[12,12,12],rest:120},{ex:"incline",sets:3,reps:[10,10,10],rest:120},
          {ex:"cablerow",sets:3,reps:[10,10,10],rest:105},{ex:"legcurl",sets:3,reps:[12,12,12],rest:90},
          {ex:"lateral",sets:2,reps:[15,15],rest:60},{ex:"hammer",sets:2,reps:[12,12],rest:60}]},
  {id:"bgC",name:"Workout C",tag:"Full body",av:"--a3",
   warm:"10 minutes: light cardio, then bodyweight squats, arm circles, band pull-aparts, and a light set of dumbbell bench.",
   items:[{ex:"dbbench",sets:3,reps:[10,10,10],rest:120},{ex:"csrow",sets:3,reps:[10,10,10],rest:105},
          {ex:"legext",sets:3,reps:[12,12,12],rest:90},{ex:"legcurl",sets:3,reps:[12,12,12],rest:90},
          {ex:"dbshoulder",sets:3,reps:[10,10,10],rest:105},{ex:"pushdown",sets:3,reps:[15,15,15],rest:60}]}
 ]};
}
const PRESETS={beginner:{label:"Full Body Beginner",make:BEGINNER_PLAN},ppl:{label:"Push / Pull / Legs",make:DEFAULT_PLAN},fullbody:{label:"3-Day Full Body",make:FULL_BODY_PLAN}};
/* Old ids from earlier versions -> library ids, so nothing logged is orphaned. */
const MIGRATE={sq:"squat",sq3:"squat",d2_squat:"squat",bp:"bench",d1_bench:"bench",br:"bbrow",d2_bbrow:"bbrow",
 rdl2:"rdl",d1_rdl:"rdl",lpd:"latpulldown",lpd3:"latpulldown",d2_latpull:"latpulldown",lat:"lateral",d2_lateral:"lateral",
 tpd:"pushdown",d1_push:"pushdown",hc:"hammer",d2_hammer:"hammer",ohp:"ohp",d1_bbpress:"ohp",pu:"pullup",d2_pullup:"pullup",
 lext:"legext",d2_legext:"legext",cr:"cablerow",cr2:"cablerow",d2_cablerow:"cablerow",inc:"incline",inc2:"incline",
 d1_incline:"incline",sk:"skull",d1_skull:"skull",pc:"preacher",d2_preacher:"preacher",lc:"legcurl",d1_legcurl:"legcurl",
 pr:"frontraise",d1_plate:"frontraise",d1_front:"frontraise",dip:"dips",d1_dips:"dips",cc:"cablecurl",d2_cablecurl:"cablecurl",
 d1_decline:"decline",d1_fly:"dbfly",d2_fly:"dbfly",d1_ohext:"ohext",d2_conc:"concentration",d2_dbpress:"dbshoulder",
 d2_preacher2:"preacher",d2_cablecurl2:"cablecurl"};
const BUILD="2026-09-23f";   /* shown next to the title and in the Data panel so you can confirm the version */

