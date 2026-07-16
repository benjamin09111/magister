## **EDF scheduling and minimal-overlap shortest-path routing for real-time TSCH networks** 

## **Miguel Gutiérrez Gaitán**[1] 

CISTER – Research Centre in Real-Time and Embedded Computing Systems Faculty of Engineering, University of Porto, Portugal Institute of Engineering, Polytechnic Institute of Porto, Portugal Facultad de Ingeniería, Universidad Andrés Bello, Chile mgg@fe.up.pt 

## **Luís Almeida** 

CISTER – Research Centre in Real-Time and Embedded Computing Systems Faculty of Engineering, University of Porto, Portugal lda@fe.up.pt 

## **Pedro Miguel Santos** 

CISTER – Research Centre in Real-Time and Embedded Computing Systems Institute of Engineering, Polytechnic Institute of Porto, Portugal pss@isep.ipp.pt 

## **Patrick Meumeu Yomsi** 

CISTER – Research Centre in Real-Time and Embedded Computing Systems Institute of Engineering, Polytechnic Institute of Porto, Portugal pmy@isep.ipp.pt 

## ~~**Abstract**~~ 

With the scope of Industry 4.0 and the Industrial Internet of Things (IIoT), wireless technologies have gained momentum in the industrial realm. Wireless standards such as WirelessHART, ISA100.11a, IEEE 802.15.4e and 6TiSCH are among the most popular, given their suitability to support real-time data traffic in wireless sensor and actuator networks (WSAN). Theoretical and empirical studies have covered prioritized packet scheduling in extenso, but only little has been done concerning methods that enhance and/or guarantee real-time performance based on routing decisions. In this work, we propose a greedy heuristic to reduce overlap in shortest-path routing for WSANs with packet transmissions scheduled under the earliest-deadline-first (EDF) policy. We evaluated our approach under varying network configurations and observed remarkable dominance in terms of the number of overlaps, transmission conflicts, and schedulability, regardless of the network workload and connectivity. We further observe that well-known graph network parameters, e.g., vertex degree, density, betweenness centrality, etc., have a special influence on the path overlaps, and thus provide useful insights to improve the real-time performance of the network. 

**2012 ACM Subject Classification** Computer systems organization → Real-time systems; Networks → Network algorithms; Networks → Data path algorithms 

**Keywords and phrases** Real-time communication, Routing, Scheduling, TDMA, Wireless networks 

**Digital Object Identifier** 10.4230/OASIcs.NG-RES.2021.2 

**Acknowledgements** This work was partially supported by the project Safe Cities - Inovação para Construir Cidades Seguras, ref. POCI-01-0247-FEDER-041435, co-funded by the European Regional Development Fund (ERDF), through the Operational Programme for Competitiveness and Internationalization (COMPETE 2020); also by National Funds through FCT/MCTES (Portuguese Foundation for Science and Technology), within the CISTER Research Unit (UIDB/04234/2020). 

## 1 Corresponding author. 

© Miguel Gutiérrez Gaitán, Luís Almeida, Pedro Miguel Santos and Patrick Meumeu Yomsi; licensed under Creative Commons License CC-BY 

Second Workshop on Next Generation Real-Time Embedded Systems (NG-RES 2021). Editors: Marko Bertogna and Federico Terraneo; Article No. 2; pp. 2:1–2:12 OpenAccess Series in Informatics 

Schloss Dagstuhl – Leibniz-Zentrum für Informatik, Dagstuhl Publishing, Germany 

## **2:2 EDF scheduling and real-time wireless routing for TSCH networks** 

## **1 Introduction** 

Wireless sensor and actuator networks (WSAN) play nowadays an important role in industrial facilities. Wireless radio links, in general, bring the flexibility and scalability that wireline infrastructure lacks, but often with relatively lower bandwidth and reliability [4]. Yet, for many applications based on sensor and actuator networks, e.g., for real-time monitoring or even audio streaming [10], low data rate wireless technologies (up to 250 Kbps) are sufficient to satisfy typical bandwidth requirements. Similarly, the reliability of standards like WirelessHART, ISA100.11a, IEEE802.15.4e and 6TiSCH, based on IEEE 802.15.4-PHY, increased to levels that are, in many cases, compatible to wired networks [18]. 

Time-synchronized channel hopping (TSCH) is among the most popular standards in the scope of WSAN to support real-time data traffic. Salient features, such as time-division multiple-access (TDMA), centralized scheduling and frequency diversity, have gradually underpinned its adoption in a number of application domains, from factory automation and process control [9] to vehicles [16], paving the way for the Industrial Internet of Things (IIoT) and Industry 4.0 [15]. 

In these domains, real-time communication is essential to ensure satisfactory (and deterministic) performance. The predictable/analyzable (time-slotted) channel access of TSCH is appropriate for that purpose which, coupled with proper (typically centralized) scheduling and routing algorithms, can provide safe operational bounds for worst-case end-to-end delays and schedulability. Several research efforts have pursued real-time communication in TSCH networks, but mostly focusing on packet scheduling. Routing, in the other hand, is often assumed as standard, e.g., using the shortest-path algorithm, leading to sub-optimal real-time performance. 

In this work, we deal with the so-called _real-time wireless routing_ [19] for TSCH networks, whose primary goal is to enhance and/or guarantee the real-time properties of the network based on routing decisions. In this respect, Wu et al. [19] proposed a _conflict-aware routing_ method for WirelessHART networks with packet transmissions scheduled using a fixedpriority policy. We tackle alike foundational questions from this work, but for TSCH WSANs under the earliest-deadline-first (EDF) scheduler, instead. We propose a _minimal-overlap shortest-path_ routing based on a greedy heuristic driven by reducing path overlaps among network flows. We show, by leveraging on prior work on schedulability analysis, that our method considerably improves the network schedulability when compared to the conventional (hop-count) shortest-path method. 

## **2 Related Work & Contribution** 

Theoretical and empirical studies for modelling and assessing the real-time performance of TSCH-like networks have been discussed in recent literature, e.g., [13, 6, 5, 8, 1, 3, 14], usually having as the main focus priority-based packet scheduling algorithms. The span of analytical works includes the design of methods based on response-time analysis [13], supply/demandbased tests [6, 5], network calculus [8], etc., often deriving theoretical/empirical bounds attempting to guarantee worst-case real-time network performance. Both fixed-priority and dynamic-priority schedulers have been covered, most of the times assuming a standard behaviour for the rest of network features, e.g., routing, channel assignment, etc. 

While for routing there are many works available in the literature [12] addressing TSCH networks, only a few of them fit into the class of _real-time wireless routing_ [19], i.e., tailored routing methods aiming to enhance and/or guarantee the real-time performance of wireless networks. Wu et al. [19] made a step ahead in this direction by proposing a _conflict-aware_ 

**M. G. Gaitán, L. Almeida, P. M. Santos and P. M. Yomsi** 

**2:3** 

_real-time routing_ for WirelessHART networks under a fixed-priority policy, but they did not address dynamic-priority schedulers. Their work leverages on a prior delay analysis for TSCH-like networks, which derives in part from the real-time CPU scheduling theory [7]. 

We highlight the importance of this prior analysis in our work, allowing to split up the end-to-end delay analysis into two components: ( _i_ ) the effect of channel contention, and ( _ii_ ) the effect of wireless transmission conflicts. The former is conveniently mapped to the multiprocessor contention concept, by assuming the number of cores as equal to the number of (radio) channels in TSCH networks. The second is specific to wireless transmission scheduling, and model the restriction of half-duplex transceivers to transmit/receive alternately, a challenging condition under mesh network topologies, which has a significant impact on end-to-end delays and schedulability. 

As in [19], we focus on the latter factor to improve routing decisions, i.e., the effect of the transmission conflicts on real-time performance, but we target transmissions scheduled under EDF. Moreover, distinctly to [19], we do not generate routes one-by-one until they become schedulable; instead, we provide a set of paths with minimal (node-) overlaps between flows, and then, we test the overall schedulability. We draw attention to the effectiveness of our approach against to the more common (hop-count) shortest path method, as well as in terms of the bandwidth utilization benefits brought by EDF in comparison to fixed-priority schedulers. We note that to the best of our knowledge, this is the first joint EDF scheduling and _real-time wireless routing_ framework for TSCH networks. 

## **3 System Model: TSCH-based network and EDF scheduling** 

We consider a WSAN as the one represented in Figure 1. The network consists of a finite number of _N_ ∈ N nodes, including one gateway, multiple access points (APs), and several field devices (i.e., sensors and actuators). The field devices are wirelessly connected to the APs forming a mesh network topology, and each of them is equipped with half-duplex omnidirectional radio transceivers. The APs are directly linked to the gateway, which, in turn, enables bidirectional communication between the field devices and other entities outside the network, e.g., the network manager, process controller, host application, etc. The network manager is a software module (typically running on the gateway) which collects network topological information and is responsible for both scheduling and routing functions. 

We assume the network is TSCH-based, i.e., relies on an IEEE 802.15.4 compatible physical layer, and uses a centralized multi-channel TDMA protocol with global synchronization. The multi-channel feature enables concurrent per-slot (but not per-channel) transmissions based on a channel hopping technique over a number of _m_ active (i.e., not-blacklisted) radio channels, with 1 ≤ _m_ ≤ 16 ∈ N. The length of the time slots is fixed (∼ 10ms), and corresponds to a (dedicated) time interval to allocate a single packet transmission, a maximum number of _w_ − 1 retransmissions (with _w_ ∈ N), and their corresponding acknowledgements. 

Sensor nodes periodically transmit data through the network to external entities, e.g., to a remote controller (located at the gateway’s node position), which, in turn, deliver control commands to the actuators (see Fig. 1). We consider transmissions occur in per-slot/per-hop basis, following predefined multi-hop routes between the sensors and the gateway (uplink), and between the gateway and the actuators (downlink), both with stringent timing delivery constraints. As for the sake of simplicity, we consider the routes are set under _source routing_ , i.e., using pre-defined single routes for both uplink and downlink. 

Without loss of generality, we also assume the topology maintenance is a native in-built centralized service or that can be further implemented, e.g., as in [17]. 

**NG-RES 2021** 

**2:4 EDF scheduling and real-time wireless routing for TSCH networks** 

**==> picture [277 x 106] intentionally omitted <==**

**----- Start of picture text -----**<br>
Network flow<br>Host  O——.<br>Application Gateway<br>Actuator<br>Network<br>Manager<br>Q oy<br>Sensor<br>Automation Process  ...<br>Controller<br>Jae Access Point O--O Field devices<br>**----- End of picture text -----**<br>


**Figure 1** Pictorial representation of an industrial WSAN. 

## **3.1 Network model** 

Given the above features, the network is modelled as a graph _G_ = ( _V, E_ ), where _V_ represents the set of vertices (or nodes), and _E_ the set of edges (or links) between those nodes. We assume the graph is undirected and connected, but not complete, i.e., there is a path between any pair of nodes in the network, but not a link between every node pair. The total number of nodes _N_ corresponds to the total number of vertices | _V_ |, i.e., _N_ = | _V_ |, where one node acts as a gateway, and the rest _N_ − 1 nodes correspond to the multiple APs and the several field devices. We further assume the gateway is the node with the highest _betweenness centrality_ , i.e., the node if being removed, has the greatest impact on the overall network connectivity. 

We consider a subset _n_ ∈ N of the field devices are used to generate data (e.g., sensor measurements), and the rest _N_ − _n_ − 1 nodes act as relay. Note that when not transmitting their own data, the _n_ transmitter field devices can act as relay too. 

## **3.2 Flow model** 

def We denote _F_ = { _f_ 1 _, f_ 2 _, . . . , fn_ } the set of _n_ real-time network flows to be transmitted from source to destination by following an EDF policy. Each _fi_ represents a periodic timeconstrained end-to-end communication flow, characterized by a 4-tuple ( _Ci, Di, Ti, φi_ ). _Ci_ denotes the effective transmission time between source and destination, _Ti_ the period (or the sampling rate of sensors), _Di_ the relative deadline, and _φi_ the routing path. These parameters are given with the interpretation that each flow _fi_ releases a potentially infinite number of transmissions. The _γ_[th] instance of those transmissions, with _γ_ ∈ N, is denoted def as _fi,γ_ , and is released at the time _ri,γ_ , such that _ri,γ_ +1 − _ri,γ_ = _Ti_ . Then, in accordance with the EDF policy, _fi,γ_ is constrained to reach its destination before its absolute deadline, def i.e., _di,γ_ = _ri,γ_ + _Di_ . We assume this is a constrained deadline model, i.e., _Di_ ≤ _Ti_ , thus allowing only a single transmission of flow _fi_ at any time slot. 

Note that here _Ci_ is interpreted as the time required by flow _fi_ to be completely transmitted from source to destination, but when it does not suffer whatsoever interference from other flows. We thus assume _Ci_ can be computed as _Ci_ = _ζi_ × _w_ (slots), where _ζi_ is total number of links in the route path _φi_ , and _w_ is the number of transmission slots assigned to a flow in each link, including retransmissions. We adopt _w_ fixed (as in WirelessHART) for all the links, thus _Ci_ being exclusively dependent on topology and routing dynamics. 

**M. G. Gaitán, L. Almeida, P. M. Santos and P. M. Yomsi** 

**2:5** 

## **3.2.1 Supply/demand-based schedulability analysis for EDF** 

For the sake of completeness, we briefly revisit our prior work on schedulability analysis for WSANs [6]. Particularly, we leverage on the so-called _forced-forward demand-bound function_ (ff-dbf) [2] when applied to the WSANs domain, which is a state-of-the-art supply/demand-bound schedulability assessment for TSCH-like WSANs under EDF [5]. 

We reproduce here the formal expression for the schedulability test, defined as the relationship between the _supply-bound function_ (sbf) [20], i.e., the minimal transmission capacity offered by a network with _m_ channels, and the ff-dbf, i.e., the upper-bound on the maximum possible demand for a set of real-time network flows _F_ = { _f_ 1 _, f_ 2 _, . . . , fn_ } (with _n_ ∈ N) when evaluated over a given time interval of length _ℓ_ 

**==> picture [383 x 28] intentionally omitted <==**

where the sbf is formally defined as follows 

**==> picture [383 x 11] intentionally omitted <==**

and the ff-dbf (for TSCH-based WSANs) is defined as 

**==> picture [384 x 29] intentionally omitted <==**

where ∆ _i,j_ denotes the transmission conflicts delay (due to path overlaps) between any pair of flows _fi_ and _fj_ ∈ _F_ , and _Ti_ and _Tj_ the respective transmission periods of these flows. 

◮ Note. On (1), unlike to the common understanding on multiprocessors [2], the ff-dbf notion refers to the upper bound on network demand due to the contribution of two components: ( _i_ ) channel contention, equivalent to the (core) contention concept on multi-core platforms, and ( _ii_ ) transmission conflicts, an abstraction specific to wireless transmission scheduling. On (3), these two components are formally dissociate as a summation. On the left side, the expression denoted as ff-dbf _[ch]_ corresponds to the channel contention contribution, which is equivalent to the expression on multiprocessors, but here it models the restriction imposed to network flows to be simultaneously scheduled on different channels (see [6] for the complete expression of ff-dbf _[ch]_ ). On the right side, the expression designates the contribution of transmission conflicts, which represents the delay experienced due to multiple flows encountering on a common node. We also note that this is a key aspect for the motivation and further understanding of the solution later proposed in the present work. 

## **4 Problem Formulation** 

Given the network and flow models presented in Section 3, we consider the problem of finding def the optimal set of flow paths Φ _opt_ = { _φ[opt]_ 1 _[, φ][opt]_ 2 _[, . . . , φ] n[opt]_[}][ that][minimizes the] _[ overall][number] of path overlaps_ between any pair of flows in the network. 

◮ **Definition 1.** _We denote as_ Ω _the_ overall number of path overlaps _between any pair of flows_ def _in the set F_ = { _f_ 1 _, f_ 2 _, . . . , fn_ } _. Particularly,_ Ω _is the sum of all the individual_ node overlaps _δij between the routes of any pair of flows fi and fj in the set F , where i, j_ ∈ [1 _, n_ ] ∧ _i_ ̸= _j._ 

**NG-RES 2021** 

## **2:6 EDF scheduling and real-time wireless routing for TSCH networks** 

def ◮ **Definition 2.** _We denote as F_ 0 = { _f_ 1[0] _[, f]_ 2[ 0] _[, . . . , f] n_[ 0][}] _[the][original][set][of][flows][in][the][network]_ def _which set of flow paths_ Φ0 = { _φ_[0] 1 _[, φ]_[0] 2 _[, . . . , φ]_[0] _n_[}] _[is][obtained][using][a][conventional][(hop-count)] shortest-path algorithm, ergo_ Ω0 _is the respective overall number of path overlaps for_ Φ0 _._ 

def ◮ **Definition 3.** _We denote as Fk_ = { _f_ 1 _[k][, f]_ 2 _[ k][, . . . , f] n[ k]_[}] _[(with][k]_[∈][N] _[)][the][k][th][variation][of][the]_ def _set of flows F_ 0 _when a sub-optimal set of routes_ Φ _k_ = { _φ[k]_ 1 _[, φ][k]_ 2 _[, . . . , φ][k] n_[}] _[is][considered,][thus]_ Ω _k is the k[th] overall number of path overlaps produced._ 

Given a network graph _G_ , an initial solution Φ0 with respective Ω0, and a number of _kmax_ ∈ N sub-optimal sets of routes Φ _k_ , we formulate the problem of minimizing Ωas follows: 

**==> picture [383 x 57] intentionally omitted <==**

where _δi,j_ (Φ _k_ ) is the number of _node overlaps_ between the routes of the flows _fi[k]_[and] _[f] j[ k]_ ∈ _Fk_ (i.e. _δij[k]_[),][∀] _[i, j]_[∈][[1] _[, n]_[]][ ∧] _[i]_[ ̸][=] _[ j]_[.][The][result][is][Ω= Ω] _[min] k_ , i.e., the minimal _overall number of overlaps_ within all the _kmax_ possible sets of flow paths [Φ1 _,_ Φ _kmax_ ]. We denote as Φ _opt_ the set of optimal routes, to any of the Φ _k_ sets of flow paths that produce Ω _[min] k_ . 

◮ Note. Each individual route _φ[k] i_[in][Φ] _[k]_[is][defined][as][a][sub-optimal][version][of][the][shortest-] path _φ_[0] _i_[,][i.e.,][the][route][length] _[ζ] i[k]_[of] _[φ][k] i_[is][always][greater][than][or][equal][to] _[ζ] i_[0][.][In][the][same] way, each individual transmission time _Ci[k]_[of] _[f] i[ k]_[is][always][a][sub-optimal][version][of] _[C] i_[0][,][thus] _Ci[k]_[being][always][greater][than][or][equal][to] _[C] i_[0][.][Yet,][we][make][clear][that][a][larger] _[C] i[k]_[does][not] necessary implies a larger Ω _k_ , and vice-versa. We also note that although, in general, a larger _Ci[k]_[may][lead][to][larger][end-to-end][delays,][we][conjecture][that][this][impact][is][less][detrimental] than the impact of flow path overlaps, thus we target to minimize this latter factor. 

## **5 Proposed Solution: Minimal-Overlaps (MO) Greedy Heuristic** 

We propose an approximate method to solve the problem formalized in (4). The approach is based on a greedy heuristic that recommends a single set Φ _k_ at each _k[th]_ iteration, and then computes the corresponding Ω _k_ . The smallest of the Ω _k_ after _kmax_ iterations is designated as Ω _[min] k_ , which is reported at the last iteration. We detail the proposed method as follows: 

## **Step 1 (Initial solution)** 

- At _k_ = 1, Φ _k_ = Φ1 is computed as function of the path overlaps resulting from Φ0, i.e., from the initial set of (hop count) shortest-paths, and from the graph _G_ = ( _V, E_ ). Φ1 is computed as the set of (weighted) shortest-paths of _G_[1] = ( _V, E_[1] ), a modified 

- version of the unitary-weighted _G_ whose set of edges is weighted as function of the node-overlapping degree derived from the set of flow paths Φ0. 

- The cost function _Wi,j_ ( _u, v_ ) that weight any edge ( _u, v_ ) in _G_ whose nodes _u_ and _v_ ∈ _V_ are simultaneously in any pair of routes _φ_[0] _i_[and] _[φ]_[0] _j_[∈][Φ][0][is][defined][as][follows:] 

**==> picture [368 x 33] intentionally omitted <==**

**M. G. Gaitán, L. Almeida, P. M. Santos and P. M. Yomsi** 

**2:7** 

where _ψ_ ∈ R is an arbitrary factor[2] , and _δi,j_[0][is][the][number][of] _[node][overlaps]_[resulting] from the routes _φ_[0] _i_[and] _[φ]_[0] _j_[∈][Φ][0][,][∀] _[i, j]_[∈][[1] _[, n]_[]][ ∧] _[i]_[ ̸][=] _[ j]_[.] 

Therefore, Φ1 is the resulting set of (weighted) shortest-paths over _G_[1] , and Ω1 the corresponding _overall number of overlaps_ for Φ1. 

If Ω1 _<_ Ω0, then Ω _[min] k_ = Ω1, else Ω _[min] k_ = Ω0. 

## **Step 2 (Greedy search)** 

For any _k_ ∈]1 _, kmax_ ], the search for a Ω _[min] k_ is generalized. 

- _G[k]_ = ( _V, E[k]_ ) is defined as the modified version of _G_[(] _[k]_[−][1)] = ( _V, E_[(] _[k]_[−][1)] ), whose set of edges is weighted using the following cost function due the node-overlapping of flow paths: 

**==> picture [368 x 35] intentionally omitted <==**

where _δi,j_[(] _[k]_[−][1)] results from the routes _φ_[(] _i[k]_[−][1)] and _φ_[(] _j[k]_[−][1)] ∈ Φ( _k_ −1) _,_ ∀ _i, j_ ∈ [1 _, n_ ] ∧ _i_ ̸= _j_ . Φ _k_ is thus computed as function of the path overlaps resulting from the set Φ( _k_ −1). If Ω _k <_ Ω _[min] k_ , then Ω _[min] k_ = Ω _k_ , else Ω _[min] k_ = Ω _[min] k_ . 

## **Step 3 (Best solution)** 

- At _k_ = _kmax_ , the algorithm finishes and provides Ω _[min] k_ , i.e., the minimal _overall number of overlaps_ within all the _kmax_ Φ _k_ sets recommended. Note that the quality of Ω _[min] k_ will depend on the quality of the generated Φ _k_ sets, as well as on the total number of iterations. 

The optimal set of routes Φ _opt_ is thus the Φ _k_ which provides Ω _[min] k_ . 

## **6 Performance Evaluation** 

We report here the relevant information for the data sets generation and performance evaluation of both, the proposed _minimal-overlap_ (weighted) shortest-path method denoted as **MO** , and the baseline (hop-count) _shortest-path_ method, denoted as **SP** . We present the assessment of the real-time performance through the schedulability ratio metric by considering varying network topologies and workload conditions. We further assess the influence of varying topologies and workload on the number of overlaps, routes length, channel contention and transmission conflicts. We show that MO significantly outperforms SP in terms of schedulability ratio, number of overlaps and transmission conflicts, while having marginal impact on the average length of the routes and channel contention. 

## **6.1 Simulation setup** 

The configuration details related to the generation of random network topologies and real-time network are described next: 

> 2 The arbitrary factor Ψ is a user-defined parameter, here assumed as constant, but that can be optimized to provide better (e.g., faster) solutions for Ω _[min] k_ . Yet, this aspect is not covered in this work. 

**NG-RES 2021** 

## **2:8 EDF scheduling and real-time wireless routing for TSCH networks** 

## **Network topologies** 

We prepared a set of 100 network topologies built upon the random generation of network graphs. Each graph was created based on a sparse uniformly distributed random matrix of size _N_ x _N_ (with _N_ ∈ N) and density Λ (with Λ in [0 _,_ 1] ∈ R). Each sparse matrix acted as an adjacency matrix for the graph generation. The size of the sparse matrix ( _N_ x _N_ ) as well as the number of vertices in the graph ( _N_ ) were fixed for all the simulation instances. We set _N_ = 66 as in [19], for benchmarking purposes. The vertex with the highest betweenness centrality[3] was chosen as gateway, while the rest _N_ − 1 vertices represented field devices and access points. A subset of _n_ ⊂ _N_ of field devices is chosen as sensors, thus assumed to periodically transmit data to the gateway. For comparison, the range of _n_ varied within [2 _,_ 22] as in [19]. We considered varying values of Λ = _Nλ_[,][where] _[λ]_[indicates][the][median] vertex degree of the graph. We controlled Λ by varying _λ_ ∈ N in the range [4 _,_ 12]. We justify this choice since in practical WSANs deployments, each node is typically required to be connected at least to other 3 nodes (i.e., _λ_ ≥ 3). We note that, in general, this setup provided connected graphs, but in the few cases that nodes were disconnected, we forced a random connection (edge) with any of the other connected vertices. 

Given the above configuration, we generated a set of shortest-path (hop-count) routes between the set of _n_ sensors and the gateway, for each graph, thus providing 100 instances of sets of _n_ routes for the baseline method. In the case of the MO method, the set of routes was generated from the baseline, but taken into consideration the degree of node-overlapping between routes as described in Section 5. The proposed set of (minimal-overlap) routes is thus the result of the evaluation of _kmax_ edge-weighted versions of each baseline graph instance. On the weight functions, we used the arbitrary factor Ψ as equal to the graph density, i.e. Ψ = Λ, for all the cases. We considered this value based on empirical observations. For the sake of scalability, we considered for all the experiments _kmax_ = 100 . We observed that a greater number of iterations ( _kmax_ ) can lead to a lower node-overlapping degree, but at the cost of higher execution times; thus we do not further explore this factor. Note that in the case of overall number of overlaps Ω _k_ that reaches zero, the algorithm stops. 

## **Network** 

We consider a random set of _n_ ∈ [2 _,_ 22] real-time network flows for each of the 100 topologies generated. The complete set of flows corresponds to the set of periodic data transmissions generated by the _n_ ⊂ _N_ sensor nodes in the graph. Each of these flows _fi_ is characterized by a 4-tuple ( _Ci, Di, Ti, φi_ ) following the model described in 3.2. Each _Ci_ represents the effective transmission time (in slots) for the route _φi_ , and can be obtained directly from the product of the number of hops (links or edges) traveled by the path _φi_ from source to destination, and the number of transmissions assigned to each slot (we assume _w_ = 2, as in WirelessHART). Thus, each of the 100 random graph instances is also generating, randomly, the _Ci_ and _φi_ occurrences. Hence, being applicable for both the MO and the SP methods. The corresponding _Ti_ periods were assumed as random harmonically generated in the form of 2 _[η]_ time slots, with _η_ ∈ N in the range [4 _,_ 7] (as in [19]). This assumption leads to a direct computation of the hyperperiod _H_ ∈ N (a.k.a, superframe length) as the maximum period within the range of harmonic periods, or as generally defined, the least 

> 3 The betweenness centrality metric was chosen to maintain a consistent relevance of the gateway within the random topologies, thus avoiding an arbitrary gateway position (e.g. at the border). As different centrality metrics can be defined based on application needs, this consideration requires further research. 

**2:9** 

## **M. G. Gaitán, L. Almeida, P. M. Santos and P. M. Yomsi** 

common multiple of the set of periods, i.e., _H_ = _lcm_ ( _T_ ), where _T_ = { _T_ 1 _, T_ 2 _, . . . , Tn_ }. So, in this case, _H_ = 2[7] = 128 slots (or equivalently 1280ms). We used _H_ = 128 slots as the length of the time interval _ℓ_ for the purposes of schedulability assessment, as well as for the performance evaluation of all the other metrics. The schedulability was evaluated using the test presented in 3.2.1, when considering a worst-case ∆ _i,j_ as in [11]. Finally, we assume _Di_ = _Ti_ for all the cases, thus reducing the original problem to an implicit-deadline model. 

◮ Note. For the sake of simplicity, we have only considered network flows that travel from sensors to the gateway, thus the case of uplink deadline-constrained single (non-redundant) set of paths (as in convergecast). Yet, we note the work can be extended to consider the downlink component, e.g., by considering additional routes traveling from the gateway to actuators in a deadline-constrained fashion, both for symmetric or asymmetric (uplink-downlink) routing, thus including the case of graph routing (as in [11]) with multiple redundant paths (and/or for multi-cast). We aim to further analyze these aspects in future research works. 

## **6.2 Simulation Results** 

The average performance of 100 test cases for both the SP and MO methods under varying network topologies and workload conditions is reported next: 

## **(** _i_ **) Number of overlaps** 

**==> picture [271 x 118] intentionally omitted <==**

**----- Start of picture text -----**<br>
60<br> = 4, SP<br>50  = 4, MO<br> = 8, SP<br>40  = 8, MO<br> = 12, SP<br>30<br> = 12, MO<br>20<br>10<br>0<br>2 4 6 8 10 12 14 16 18 20 22<br># of flows<br># of overlaps<br>**----- End of picture text -----**<br>


**Figure 2** The average number of overlaps under varying number of flows _n_ ∈ [2 _,_ 22], and varying median vertex degree _λ_ = {4 _,_ 8 _,_ 12}. _N_ = 66 nodes, _m_ = 8 channels. 

## **(** _ii_ **) Routes length** 

**==> picture [271 x 118] intentionally omitted <==**

**----- Start of picture text -----**<br>
5<br> = 4, SP  = 8, SP  = 12, SP<br>4.5  = 4, MO  = 8, MO  = 12, MO<br>4<br>3.5<br>3<br>2.5<br>2<br>2 4 6 8 10 12 14 16 18 20 22<br># of flows<br># of hops<br>**----- End of picture text -----**<br>


**Figure 3** The average length of the routes under varying number of flows _n_ ∈ [2 _,_ 22], and varying median vertex degree _λ_ = {4 _,_ 8 _,_ 12}. _N_ = 66 nodes, _m_ = 8 channels. 

**NG-RES 2021** 

## **2:10 EDF scheduling and real-time wireless routing for TSCH networks** 

## **(** _iii_ **) Channel contention** 

**==> picture [235 x 110] intentionally omitted <==**

**----- Start of picture text -----**<br>
100<br>—_o— m = 4, SP<br>80 -eB- m = 4, MO a1<br>oo m = 8, SP _4q HH<br>60 -e- m = 8, MO _ F] =<br>A m = 12, SP _-i<br>-A- m = 12, MO _#<br>40 ae -# FS<br>_§ PS <2<br>ac ES 5S) 8<br>20<br>0<br>2 4 6 8 10 12 14 16 18 20 22<br># of flows<br># of slots<br>**----- End of picture text -----**<br>


**Figure 4** The average contention demand under varying number of flows _n_ ∈ [2 _,_ 22], and varying number of channels _m_ = {4 _,_ 8 _,_ 12}. _N_ = 66 nodes, median vertex degree _λ_ = 4. 

## **(** _iv_ **) Transmission conflicts** 

**==> picture [239 x 105] intentionally omitted <==**

**----- Start of picture text -----**<br>
1500<br>—— 1  = 4, SP<br> = 4, MO<br>—o— ir  = 8, SP<br>1000 -O-)  = 8, MO a |<br>A)  = 12, SP = fH<br>-A-)  = 12, MO = a SSy A<br>500 a 2 ogIs yes<br>IZJ es2 = A —_--@<br>= e a =u _ -- Qr= AN<br>0 $a a eae— —N yas Q—- — g- X—-— AK2 = Bo<br>2 4 6 8 10 12 14 16 18 20 22<br># of flows<br># of slots<br>**----- End of picture text -----**<br>


**Figure 5** The average conflict demand under varying number of flows _n_ ∈ [2 _,_ 22], and varying median vertex degree _λ_ = {4 _,_ 8 _,_ 12}. _N_ = 66 nodes, _m_ = 8 channels. 

## **(** _v_ **) Schedulability ratio** 

**==> picture [314 x 222] intentionally omitted <==**

**----- Start of picture text -----**<br>
1 a =——8 ==— 2 = & S A=<br>5] AS ~ \ —-\  = 4, SP<br>0.8 ‘. Q \ -B-)  = 4, MO<br>S u \. ‘ —o-)  = 8, SP<br> = 8, MO<br>0.6 IN\ \ oN -O-)x  = 12, SP<br>N Q‘\ ‘a \ \ \ N|-A-)|)  = 12, MO<br>0.4 s ‘ \ \ \ \Ne<br>0.2<br>iS S A new _ SSAL<br>0<br>2 4 6 8 10 12 14 16 18 20 22<br># of flows<br>1 = a= === a<br>4 SA XN ana m = 2, SP<br>0.8 m = 2, MO<br>N nN a \ ~” -o-oO m = 8, SP<br>0.6 Q \ \ \IN -e-A] m = 8, MOm = 16, SP<br>N \ S S» =4- m = 16, MO<br>0.4 IN \ \ wQg<br>S\»<br>0.2 N \\» [»]<br>Se Ye<br>0<br>2 4 6 8 10 12 14 16 18 20 22<br># of flows<br>schedulability ratio<br>schedulability ratio<br>**----- End of picture text -----**<br>


**Figure 6** The schedulability ratio under varying number of flows _n_ ∈ [2 _,_ 22] and fixed number of nodes _N_ = 66. On top, the case of varying median vertex degree _λ_ = {4 _,_ 8 _,_ 12} and _m_ = 8 channels. On bottom, the case of varying number of channels _m_ = {2 _,_ 8 _,_ 16} and median vertex degree _λ_ = 4. 

**2:11** 

## **M. G. Gaitán, L. Almeida, P. M. Santos and P. M. Yomsi** 

## **6.3 Discussion** 

The performance comparison of MO and SP in terms the overall (average) number of overlaps confirms the main intuition behind the proposed method. The greedy heuristic search of MO albeit sub-optimal is able to effectively reduce the node-overlapping degree in up to half (and more) of the baseline (Fig. 2). This, depending of the number of flows and network density (or vertex degree). The exponential growth of the overlaps as function of the number of flows justifies the need for its mitigation. This trend is also observable in the growth imposed on transmission conflicts, which directly depends on the number of overlaps (Fig. 5). The compromise on the route lengths is marginal, whose impact is even negligible on more connected networks (Fig. 3). The influence on the channel contention is also minor, being discernible (in practice) only on networks with a lower number of active channels (Fig. 4). The benefits on the overall network schedulability are clear, regardless of the degree of connectivity (Fig. 6, top) or the available radio channels (Fig. 6, bottom), but suggesting superfluous effect on this latter parameter at a given point (see _m_ = 8 and _m_ = 16). All in all, the prospect for the proposed method is promising, both as a general technique to reduce the impact on conflict delays on wireless mesh network, or as an specific joint EDF scheduling and routing framework to provide real-time guarantees on TSCH-based networks. 

## **7 Summary & Conclusion** 

We have developed an effective _real-time wireless routing_ for TSCH-based WSANs with packet transmissions scheduled under an EDF policy. The approach based on a greedy heuristic for path-overlap minimization shown to be successful in reducing transmission conflicts and improving schedulability, while having marginal impact on contention and routes length. Simulation results under varying topologies and workload conditions revealed a remarkable dominance of our approach over the more common (hop-count) shortest path method. To conclude, we leverage on our prior work on schedulability analysis to frame both together as a novel _joint real-time scheduling and routing_ framework for TSCH WSANs. 

## ~~**References**~~ 

- **1** Giuliana Alderisi, Svetlana Girs, Lucia Lo Bello, Elisabeth Uhlemann, and Mats Björkman. Probabilistic scheduling and adaptive relaying for WirelessHART networks. In _2015 IEEE 20th Conference on Emerging Technologies & Factory Automation (ETFA)_ , pages 1–4. IEEE, 2015. 

- **2** Sanjoy Baruah, Vincenzo Bonifaci, Alberto Marchetti-Spaccamela, and Sebastian Stiller. Improved multiprocessor global schedulability analysis. _Real-Time Systems_ , 46(1):3–24, 2010. 

- **3** Keoma Brun-Laguna, Pascale Minet, and Yasuyuki Tanaka. Optimized scheduling for timecritical industrial IoT. In _2019 IEEE Global Communications Conference (GLOBECOM)_ , pages 1–6. IEEE, 2019. 

- **4** Domenico De Guglielmo, Simone Brienza, and Giuseppe Anastasi. IEEE 802.15. 4e: A survey. _Computer Communications_ , 88:1–24, 2016. 

- **5** Miguel Gutiérrez Gaitán, Patrick M. Yomsi, Pedro M. Santos, and Luís Almeida. Workin-progress: Assessing supply/demand-bound based schedulability tests for wireless sensoractuator networks. In _2020 16th IEEE International Conference on Factory Communication Systems (WFCS)_ , pages 1–4. IEEE, 2020. 

- **6** Miguel Gutiérrez Gaitán and Patrick Meumeu Yomsi. FF-DBF-WIN: On the forced-forward demand-bound function analysis for wireless industrial networks. In _2018 30th Euromicro Conference on Real-Time Systems (ECRTS), Proceedings of the Work-in-Progress Session_ , pages 13–15, 2018. 

**NG-RES 2021** 

## **2:12 EDF scheduling and real-time wireless routing for TSCH networks** 

- **7** Miguel Gutiérrez Gaitán and Patrick Meumeu Yomsi. Multiprocessor scheduling meets the industrial wireless: A brief review. _U. Porto Journal of Engineering_ , 5(1):59–76, 2019. 

- **8** Harrison Kurunathan, Ricardo Severino, Anis Koubâa, and Eduardo Tovar. Worst-case bound analysis for the time-critical MAC behaviors of IEEE 802.15. 4e. In _2017 IEEE 13th International Workshop on Factory Communication Systems (WFCS)_ , pages 1–9. IEEE, 2017. 

- **9** Chenyang Lu, Abusayeed Saifullah, Bo Li, Mo Sha, Humberto Gonzalez, Dolvara Gunatilaka, Chengjie Wu, Lanshun Nie, and Yixin Chen. Real-time wireless sensor-actuator networks for industrial cyber-physical systems. _Proceedings of the IEEE_ , 104(5):1013–1024, 2015. 

- **10** Rahul Mangharam, Anthony Rowe, Raj Rajkumar, and Ryohei Suzuki. Voice over sensor networks. In _2006 27th IEEE International Real-Time Systems Symposium (RTSS)_ , pages 291–302. IEEE, 2006. 

- **11** Venkata Prashant Modekurthy, Dali Ismail, Mahbubur Rahman, and Abusayeed Saifullah. A utilization-based approach for schedulability analysis in wireless control systems. In _2018 IEEE International Conference on Industrial Internet (ICII)_ , pages 49–58. IEEE, 2018. 

- **12** Marcelo Nobre, Ivanovitch Silva, and Luiz Affonso Guedes. Routing and scheduling algorithms for WirelessHART networks: A survey. _Sensors_ , 15(5):9703–9740, 2015. 

- **13** Abusayeed Saifullah, You Xu, Chenyang Lu, and Yixin Chen. Real-time scheduling for WirelessHART networks. In _2010 31st IEEE Real-Time Systems Symposium (RTSS)_ , pages 150–159. IEEE, 2010. 

- **14** Stefano Scanzio, Mohammad Ghazi Vakili, Gianluca Cena, Claudio Giovanni Demartini, Bartolomeo Montrucchio, Adriano Valenzano, and Claudio Zunino. Wireless sensor networks and TSCH: A compromise between reliability, power consumption, and latency. _IEEE Access_ , 8:167042–167058, 2020. 

- **15** Emiliano Sisinni, Abusayeed Saifullah, Song Han, Ulf Jennehag, and Mikael Gidlund. Industrial internet of things: Challenges, opportunities, and directions. _IEEE Transactions on Industrial Informatics_ , 14(11):4724–4734, 2018. 

- **16** Rasool Tavakoli, Majid Nabi, Twan Basten, and Kees Goossens. Topology management and TSCH scheduling for low-latency convergecast in in-vehicle WSNs. _IEEE Transactions on Industrial Informatics_ , 15(2):1082–1093, 2018. 

- **17** Federico Terraneo, Paolo Polidori, Alberto Leva, and William Fornaciari. TDMH-MAC: Realtime and multi-hop in the same wireless MAC. In _2018 IEEE Real-Time Systems Symposium (RTSS)_ , pages 277–287. IEEE, 2018. 

- **18** Mališa Vučinić, Tengfei Chang, Božidar Škrbić, Enis Kočan, Milica Pejanović-Djurišić, and Thomas Watteyne. Key performance indicators of the reference 6TiSCH implementation in Internet-of-Things scenarios. _IEEE Access_ , 8:79147–79157, 2020. 

- **19** Chengjie Wu, Dolvara Gunatilaka, Mo Sha, and Chenyang Lu. Real-time wireless routing for industrial internet of things. In _2018 IEEE/ACM Third International Conference on Internet-of-Things Design and Implementation (IoTDI)_ , pages 261–266. IEEE, 2018. 

- **20** Changqing Xia, Xi Jin, and Peng Zeng. Resource analysis for wireless industrial networks. In _Proceedings of the 12th International Conference on Mobile Ad-Hoc and Sensor Networks (MSN)_ , pages 424–428. IEEE, 2016. 

