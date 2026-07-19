%% main_compare_sp_mo.m
% Réplica modular SP vs MO
% Mantiene la misma lógica base del código original del usuario
clear; clc; close all;

cfg = config_default();

results = run_experiment_suite(cfg);

plot_overlaps_results(results, cfg);
plot_hops_results(results, cfg);