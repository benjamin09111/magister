%% main_compare_mo_moaco.m
% Comparación modular: MO vs MO+ACO
clear; clc; close all;

cfg = config_mo_aco();

results = run_experiment_suite_mo_vs_moaco(cfg);

plot_overlaps_results_mo_vs_moaco(results, cfg);
plot_hops_results_mo_vs_moaco(results, cfg);