export const DEFAULT_EXERCISES = {
  "routine_metadata": {
    "goal": "weight_loss_to_88kg",
    "protein_target_grams": 200,
    "daily_water_liters": 3.5,
    "rest_between_sets_seconds": 60,
    "cardio_type": "incline_treadmill_walk",
    "cardio_parameters": "15_min_10_pct_incline_post_workout"
  },
  "training_days": [
    {"day_number":1,"session_name":"Upper Body Power","exercises":[
      {"exercise_name":"barbell_bench_press","exercise_type":"strength","sets":4,"reps":6,"current_weight_kg":0,"rest_seconds":90,"special_notes":"focus_on_explosive_concentric"},
      {"exercise_name":"pendlay_row","exercise_type":"strength","sets":4,"reps":6,"current_weight_kg":0,"rest_seconds":90,"special_notes":"torso_parallel_to_floor"},
      {"exercise_name":"dumbbell_military_press","exercise_type":"strength","sets":3,"reps":8,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"lat_pulldown","exercise_type":"strength","sets":3,"reps":8,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"bicep_curls","exercise_type":"strength","sets":3,"reps":10,"current_weight_kg":0,"group_id":"A1","group_type":"superset","rest_seconds":30},
      {"exercise_name":"tricep_pushdowns","exercise_type":"strength","sets":3,"reps":10,"current_weight_kg":0,"group_id":"A1","group_type":"superset","rest_seconds":30},
      {"exercise_name":"incline_treadmill_walk","exercise_type":"cardio","intensity_mode":"LISS","duration_min":15,"incline_pct":10,"speed_kmh":5.0}
    ]},
    {"day_number":2,"session_name":"Lower Body Density","exercises":[
      {"exercise_name":"barbell_squat","exercise_type":"strength","sets":4,"reps":10,"current_weight_kg":0,"max_safety_limit_kg":60,"tempo":"3210","rest_seconds":60,"special_notes":"protect_quadriceps_tendon"},
      {"exercise_name":"leg_press","exercise_type":"strength","sets":3,"reps":12,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"leg_extension_hold","exercise_type":"isometric","sets":3,"duration_sec":15,"rest_seconds":45,"special_notes":"max_contraction_at_top"},
      {"exercise_name":"lying_leg_curl","exercise_type":"strength","sets":4,"reps":12,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"incline_treadmill_walk","exercise_type":"cardio","intensity_mode":"LISS","duration_min":15,"incline_pct":10,"speed_kmh":5.0}
    ]},
    {"day_number":3,"session_name":"Active Recovery LISS","exercises":[
      {"exercise_name":"incline_treadmill_walk","exercise_type":"cardio","intensity_mode":"LISS","duration_min":35,"incline_pct":12,"speed_kmh":5.5,"target_heart_rate_bpm":130}
    ]},
    {"day_number":4,"session_name":"Push + Finisher","exercises":[
      {"exercise_name":"incline_dumbbell_press","exercise_type":"strength","sets":4,"reps":10,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"cable_flyes","exercise_type":"strength","sets":3,"reps":12,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"dumbbell_lateral_raises","exercise_type":"strength","sets":4,"reps":15,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"bench_dips","exercise_type":"strength","sets":3,"reps":15,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"burpees_no_jump","exercise_type":"strength","sets":3,"reps":15,"group_id":"F1","group_type":"finisher","rest_seconds":20,"special_notes":"no_impact_on_knees"},
      {"exercise_name":"incline_treadmill_walk","exercise_type":"cardio","intensity_mode":"LISS","duration_min":15,"incline_pct":10,"speed_kmh":5.0}
    ]},
    {"day_number":5,"session_name":"Pull + Core","exercises":[
      {"exercise_name":"low_row_cable","exercise_type":"strength","sets":4,"reps":10,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"v_bar_lat_pulldown","exercise_type":"strength","sets":4,"reps":10,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"face_pulls","exercise_type":"strength","sets":3,"reps":15,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"weighted_plank","exercise_type":"isometric","sets":3,"duration_sec":60,"rest_seconds":45,"special_notes":"keep_glutes_engaged"},
      {"exercise_name":"ab_wheel_rollout","exercise_type":"strength","sets":3,"reps":10,"rest_seconds":60},
      {"exercise_name":"incline_treadmill_walk","exercise_type":"cardio","intensity_mode":"LISS","duration_min":15,"incline_pct":10,"speed_kmh":5.0}
    ]},
    {"day_number":6,"session_name":"Legs & Glutes Explosive","exercises":[
      {"exercise_name":"barbell_hip_thrust","exercise_type":"strength","sets":4,"reps":10,"current_weight_kg":0,"rest_seconds":60,"special_notes":"pause_1s_at_top"},
      {"exercise_name":"romanian_deadlift","exercise_type":"strength","sets":4,"reps":10,"current_weight_kg":0,"rest_seconds":60,"special_notes":"focus_on_hamstring_stretch"},
      {"exercise_name":"walking_lunges","exercise_type":"strength","sets":3,"reps":12,"current_weight_kg":0,"rest_seconds":60,"special_notes":"long_steps_for_glute_bias"},
      {"exercise_name":"hip_abduction_machine","exercise_type":"strength","sets":3,"reps":20,"current_weight_kg":0,"rest_seconds":60},
      {"exercise_name":"incline_treadmill_walk","exercise_type":"cardio","intensity_mode":"LISS","duration_min":15,"incline_pct":10,"speed_kmh":5.0}
    ]}
  ]
};

export const DEFAULT_PROGRESSION = {
  "progression_data": [
    {"week_number":1,"phase":"adaptation","weight_change_pct":"0%","reps_change":"baseline","rpe_target":7,"system_focus":"technique_re-entry"},
    {"week_number":2,"phase":"adaptation","weight_change_pct":"+2.5%","reps_change":"maintain","rpe_target":7.5,"system_focus":"progressive_overload"},
    {"week_number":3,"phase":"adaptation","weight_change_pct":"+2.5%","reps_change":"maintain","rpe_target":8,"system_focus":"volume_accumulation"},
    {"week_number":4,"phase":"deload","weight_change_pct":"-20%","reps_change":"-50% sets","rpe_target":5,"system_focus":"nervous_system_recovery"},
    {"week_number":5,"phase":"density","weight_change_pct":"0%","reps_change":"+2 reps","rpe_target":8,"system_focus":"metabolic_stress"},
    {"week_number":6,"phase":"density","weight_change_pct":"0%","reps_change":"+2 reps","rpe_target":8.5,"system_focus":"work_capacity"},
    {"week_number":7,"phase":"density","weight_change_pct":"+2.5%","reps_change":"maintain high reps","rpe_target":9,"system_focus":"fat_loss_peak"},
    {"week_number":8,"phase":"deload","weight_change_pct":"-20%","reps_change":"-50% sets","rpe_target":5,"system_focus":"hormonal_reset"},
    {"week_number":9,"phase":"intensity","weight_change_pct":"+5%","reps_change":"reduce to baseline","rpe_target":8.5,"system_focus":"muscle_retention"},
    {"week_number":10,"phase":"intensity","weight_change_pct":"+2.5%","reps_change":"maintain","rpe_target":9,"system_focus":"strength_peak"},
    {"week_number":11,"phase":"intensity","weight_change_pct":"maintain","reps_change":"+1 rep","rpe_target":9.5,"system_focus":"overreach_control"},
    {"week_number":12,"phase":"deload","weight_change_pct":"-20%","reps_change":"-50% sets","rpe_target":5,"system_focus":"final_recovery"},
    {"week_number":13,"phase":"peaking","weight_change_pct":"maintain","reps_change":"max effort","rpe_target":9.5,"system_focus":"final_cut_definition"},
    {"week_number":14,"phase":"peaking","weight_change_pct":"maintain","reps_change":"max effort","rpe_target":10,"system_focus":"target_achievement_88kg"}
  ]
};
