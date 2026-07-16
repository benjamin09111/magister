=================================================================
  BAYESIAN OPTIMIZATION de psi en MO -- NG-RES 2021
=================================================================
  Escenario: lambda=8, n=14, N=66
  Rango:     psi in [0.001, 0.15] (log scale)
  psi_auto:  0.121212
  Criterios stop: eps_psi=0.05 | eps_omega=0.05 | flat<5
=================================================================

--- FASE 1: Warm-up Grid (10 pts x 25 trials) ---

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.72       2.44       1.97       2.14       0.00       0.00       0.0       
  [W01/10] psi=0.001   Omega=2.720

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.72       2.44       1.97       2.14       0.00       0.00       0.0       
  [W02/10] psi=0.0019194   Omega=2.720

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.44       2.44       1.99       2.14       0.00       0.00       0.0       
  [W03/10] psi=0.003684   Omega=2.440

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.88       2.44       2.03       2.14       0.00       0.00       0.0       
  [W04/10] psi=0.0070711   Omega=1.880

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.64       2.44       2.07       2.14       0.00       0.00       0.0       
  [W05/10] psi=0.013572   Omega=1.640

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.60       2.44       2.07       2.14       0.00       0.00       0.0       
  [W06/10] psi=0.02605   Omega=1.600

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.64       2.44       2.09       2.14       0.00       0.00       0.0       
  [W07/10] psi=0.05   Omega=1.640

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.92       2.44       2.07       2.14       0.00       0.00       0.0       
  [W08/10] psi=0.072112   Omega=1.920

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.40       2.44       2.12       2.14       0.00       0.00       0.0       
  [W09/10] psi=0.104   Omega=2.400

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       3.20       2.44       2.16       2.14       0.00       0.00       0.0       
  [W10/10] psi=0.15   Omega=3.200
Warmup OK en 152.6s

--- FASE 2: Bayesian Optimization (25 iters max) ---

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.75       2.70       2.06       2.10       0.00       0.00       0.0       
  [BO 01/25] psi=0.025101  Omega=1.750  EI=0.1451  best=1.600 (psi*=0.02605) [SH:2x]

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.82       2.70       2.05       2.10       0.00       0.00       0.0       
  [BO 02/25] psi=0.025741  Omega=1.825  EI=0.0582  best=1.600 (psi*=0.02605) [SH:2x]

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.80       2.70       2.08       2.10       0.00       0.00       0.0       
  [BO 03/25] psi=0.043679  Omega=1.800  EI=0.0090  best=1.600 (psi*=0.02605) [SH:2x]

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.82       2.70       2.05       2.10       0.00       0.00       0.0       
  [BO 04/25] psi=0.012719  Omega=1.825  EI=0.0102  best=1.600 (psi*=0.02605) [SH:2x]

--> PARADA: C2: convergencia Omega (|DOmega|=0.025)
--> Mejor encontrado: psi*=0.02605, Omega*=1.600

--- FASE 3: Refinamiento local (5 pts x 40 trials) ---

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.90       2.70       2.03       2.10       0.00       0.00       0.0       
  [R1] psi=0.011636  Omega=1.900

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.75       2.70       2.05       2.10       0.00       0.00       0.0       
  [R2] psi=0.01741  Omega=1.750

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.80       2.70       2.04       2.10       0.00       0.00       0.0       
  [R3] psi=0.02605  Omega=1.800

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.85       2.70       2.07       2.10       0.00       0.00       0.0       
  [R4] psi=0.038977  Omega=1.850

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.02       2.70       2.06       2.10       0.00       0.00       0.0       
  [R5] psi=0.058319  Omega=2.025

  Minimo analitico (parabola): psi=0.0223793

--- FASE 4: Validacion final (100 trials) ---

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.64       2.44       2.05       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.64       2.44       2.05       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.64       2.44       2.05       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.64       2.44       2.05       2.14       0.00       0.00       0.0       
  psi=0.022379 -> Omega = 1.640 +/- 0.000 (95% CI)

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.60       2.44       2.07       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.60       2.44       2.07       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.60       2.44       2.07       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       1.60       2.44       2.07       2.14       0.00       0.00       0.0       
  psi=0.02605 -> Omega = 1.600 +/- 0.000 (95% CI)

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.44       2.44       2.14       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.44       2.44       2.14       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.44       2.44       2.14       2.14       0.00       0.00       0.0       

====================================================
bo_opt vs MO: lambda = 8 (Lambda = 0.1212)
====================================================
n        ALT_Omg    MO_Omg     ALT_Hops   MO_Hops    ALT_Conf   MO_Conf    Red_%     
14       2.44       2.44       2.14       2.14       0.00       0.00       0.0       
  psi=0.12121 -> Omega = 2.440 +/- 0.000 (95% CI)

=================================================================
  RESULTADO FINAL
=================================================================
  psi OPTIMO:       0.02605
  Omega (100t):     1.600 +/- 0.000 (95% CI)
  psi_auto (paper): 0.121212  ->  Omega=2.440
  Mejora vs paper:  34.4%
  Criterio parada:  C2: convergencia Omega (|DOmega|=0.025)
=================================================================

Resultados guardados: /MATLAB Drive/mo_sp_pt1/results_mo_phi_bo_v2.mat