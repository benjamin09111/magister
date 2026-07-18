## Multigateway Designation for Real-Time TSCH Networks Using Spectral Clustering and Centrality

Miguel Gutiérrez Gaitán , Member, IEEE, Diego Dujovne , Senior Member, IEEE, Julián Zuñiga, [URL 🔗](https://orcid.org/0000-0002-3307-8731)

Alejandro Figueroa , and Luís Almeida , Senior Member, IEEE [URL 🔗](https://orcid.org/0000-0002-6317-728X)

Abstract—This letter proposes a multigateway designation framework to design real-time wireless sensor networks (WSNs) improving traffic schedulability, i.e., meeting the traffic time constraints. To this end, we resort to spectral clustering- unsupervised learning that allows defining arbitrary k disjoint clusters without the knowledge of the node’s physical position. In each cluster, we use a centrality metric from social sciences to designate one gateway. This novel combination is applied to a time-synchronized channel-hopping (TSCH) WSN under earliest-deadline-first (EDF) scheduling and shortest path rout- ing. Simulation results under varying configurations show that our framework is able to produce WSN designs that greatly reduce the worst case network demand. In a situation with five gateways, 99% schedulability can be achieved with 3.5 times more real-time flows than in a random benchmark.

Index Terms—Centrality, clustering, earliest-deadline-first (EDF), time-synchronized channel-hopping (TSCH), wireless sen- sor network (WSN).

## I. INTRODUCTION

The Industrial Internet of Things (IIoT) revolutionized fac- tories with a remarkable increase of wireless technologies [1]. For example, WirelessHART, ISA100.11a, and 6TiSCH [2] became popular in industrial monitoring and process con- trol [3]. Time-synchronized channel hopping (TSCH) or [URL 🔗](#page-0)

Manuscript received 6 August 2022; revised 7 September 2022; accepted 13 September 2022. Date of publication 23 September 2022; date of current version 29 May 2023. This work was supported in part by the National Funds through FCT/MCTES (Portuguese Foundation for Science and Technology) within the CISTER Research Unit under Grant UIDB/04234/2020; in part by the Operational Programme for Competitiveness and Internationalization (COMPETE 2020) through the European Regional Development Fund (ERDF) under Agreement PT2020; in part by FCT and the European Social Fund (ESF) through the Regional Operational Programme (ROP) Norte 2020 under Ph.D. Grant 2020.06685.BD; in part by the CYTED AgIoT Project under Grant 520RT011; in part by CORFO COTH2O “Consorcio de Gestión de Recursos Hídricos para la Macrozona Centro-Sur”; and in part by Proyecto Asociativo UDP “Plataformas Digitales como Modelo Organizacional. This manuscript was recommended for publication by L. De Micco. (Corresponding author: Miguel Gutiérrez Gaitán.)

Miguel Gutiérrez Gaitán is with the Faculty of Engineering, Andrés Bello University, Santiago 8370146, Chile, also with the Research Centre in Real- Time and Embedded Computing Systems, 4200-072 Porto, Portugal, and also with the Electrical and Computer Engineering Department, University of Porto, 4200-465 Porto, Portugal (e-mail: miguel.gutierrez@unab.cl).

Diego Dujovne and Julián Zuñiga are with the Facultad de Ingenieria y Ciencias, Diego Portales University, Santiago 7850000, Chile.

Alejandro Figueroa is with the Faculty of Engineering, Andrés Bello University, Santiago 8370146, Chile.

Luís Almeida is with the Research Centre in Real-Time and Embedded Computing Systems, 4200-072 Porto, Portugal, and also with the Department of Electrical and Computer Engineering, University of Porto, 4200-465 Porto, Portugal.

Digital Object Identifier 10.1109/LES.2022.3209137

1943-0671 c 2022 IEEE. Personal use is permitted, but republication/redistribution requires IEEE permission.

See https://www.ieee.org/publications/rights/index.html for more information.

time-slotted channel hopping is a medium access control (MAC) layer common to these technologies offering real-time communication features.

In the context of IIoT, many networks are wireless sensor networks (WSNs) with a fixed set of field nodes gathering data from a process to support system wide monitoring and control. The network flows are static, defined at design time, and converge to one or more gateways. Typically, gateways are deployed in some arbitrary positions. Conversely, gateway des- ignation uses existing nodes for the gateway function without adding new ones, but their positions are constrained, instead.

Proper gateway designation, routing, and scheduling are needed for real-time flows to meet their time constraints, e.g., deadlines. Recent work showed that network centrality (a con- cept from social networks) can support gateway designation to significantly improve the real-time performance of TSCH WSNs by design [4]. Prior studies also showed that using multiple gateways (as known as sinks) increases paralleliza- tion of flows and improves the traffic timeliness in industrial WSNs [5]. However, to the best our knowledge, none of these works used schedulability, i.e., ability to satisfy all traffic time constraints, as a primary design criterion. [URL 🔗](#page-0)

Thus, our research contributes to the state of the art in real-time TSCH WSNs providing a multigateway designation framework for improved schedulability that consists on first clustering the network with spectral clustering [6], which does not require the knowledge of nodes’ positions, just adjacency, and then applying a centrality metric to designate a gateway inside each cluster. Note that clustering is used only for gate- way designation, being orthogonal to traffic scheduling and routing that operate globally across the network. Moreover, our gateway designation framework is parametric, allowing explor- ing the tradeoff between schedulability and k, the number of gateways; thus, supporting efficient designs with the minimum number of gateways needed to guarantee traffic schedulability. Finally, simulation results with random topologies and mes- sage sets achieve 99% schedulability using 5 gateways with 3.5 times more real-time flows than a random gateway designation. [URL 🔗](#page-0)

## II. RELATED WORK

Chen et al. [7] studied the minimum sink placement in TSCH networks with latency and reliability guarantees, and showed the problem is NP-hard. They proposed an algorithm to solve it by jointly considering the RPL routing protocol and DeTAS scheduling, but not considering schedulability analysis. Dobslaw et al. [5] addressed schedulability as a QoS constraint by proposing a complete cross-layer config- uration for industrial WSN that considers, among other, the possibility of adding multiple sinks. Their work also used [URL 🔗](#page-0)


clustering, but based on k-means that requires actual nodes positions, thus being not applicable to WSNs represented by connectivity graphs and lacking the position of nodes as in our case. Conversely, spectral clustering [6], which we use, can be directly applied to connectivity graphs, e.g., expressed as adjacency matrices. Several other studies in the literature have addressed alike problems (see [8], [9], [10]), either from the perspective of clustering and/or from the viewpoint of multisink placement, targeting common delay or reliability issues. [URL 🔗](#page-0)

However, to the best of our knowledge, none provided schedulability analysis and commonly require knowledge of the nodes positions and use an arbitrary gateway placement approach. Our work is the first to provide a position-agnostic multigateway designation method for improved network schedulability. For this reason, we compare against a ran- dom gateway designation baseline, similarly to other works addressing the single-gateway designation problem [11]. [URL 🔗](#page-0)

## III. SYSTEM MODEL

## A. Network Model

A WSN is abstracted using an undirected graph

where

respectively. Nodes can perform the sensing, relaying, or gate- way functions and are connected wirelessly forming a mesh.

The total number of nodes is N =|V| among which k are gateways.

The network is assumed to be TSCH based, thus glob- ally synchronized using a TDMA framework with multiple

channels (up to m = 16). This enables multihop concurrent and single-packet transmissions at each slot/hop. All trans- missions are assumed to be triggered following a global traffic schedule. We assume this plan is made according to an earliest- deadline-first (EDF) scheduling policy and shortest path source routing.

G = (V, E),

V and E are the set of vertices (nodes) and edges (links),

## B. Flow Model

We consider a number of n sensor nodes transmitting periodically their sensing data toward any of the k gate- ways. These messages are required to reach the gateways before specific timing constraints (deadlines). We denote as

F ={f1, f2,..., fn} the set n of time-sensitive flows. Each flow is characterized by a tuple (Ci, Di, Ti,φi), where Ci is the transmission time between node si and one of the k gateways, Ti is the transmission period, Di is the (relative) deadline, and φi is the multihop routing path. Note that each flow releases potentially an infinite number of transmissions. Formally, the γth instance is released at time ri,γ such that ri,γ+1−ri,γ = Ti.

Then, by following the EDF policy, di,γ = ri,γ+Di denotes the absolute deadline for fi,γ to arrive at its gateway (destination).

## C. Performance Model

We use the supply/demand-bound-based schedulability anal- ysis in [12] to evaluate the ability of the WSN to satisfy the timing constraints of all flows in the network as in [13]. Specifically, this method checks whether the supply bound function (sbf) is greater than or equal to the so-called forced- forward demand-bound function (FF-DBF) adapted for WSNs. The sbf is the minimal transmission capacity offered by a WSN with m channels, while FF-DBF is the upper bound on [URL 🔗](#page-0)

the demand generated by a set F of n deadline-constrained flows when evaluated in any interval of length .

Equation (1) formally presents the supply/demand-bound- based schedulability test where sbf() fulfils the conditions in (2) and the FF-DBF-WSN is defined by (3) [URL 🔗](#page-0)

FF-DBF-WSN() ≤ sbf() ∀ ≥0(1)

sbf(0) = 0 ∧ sbf( + h) − sbf() ≤ m× h ∀, h ≥ 0(2)

Note that FF-DBF-WSN results from two terms contribut- ing to the worst case network demand: 1) channel contention and 2) transmission conflicts. The former, expressed by the left parcel of (3), is equivalent to FF-DBF for multiproces- for scheduling on multiple channels. The latter, expressed sors [14], here used to model the mutually exclusive condition by the right parcel, represents the delay contribution due to multiple flows converging on a common half-duplex node. Equation (4) presents i,j as the overlapping factor between [URL 🔗](#page-0)

the paths of flows fi and fj ∈ F (with i = j) as defined in [15] [URL 🔗](#page-0)

h	=1

q=1

δ(ij) is the total number of overlaps between fi and fj of which δ	(ij) are the ones larger than 3. Lenq(ij) and Lenq (ij) are the respective q and q overlap lengths between fi and fj,with

h ∈ [1,δ(ij)] and q ∈ [1,δ	(ij)]. After three hops, slots can be reused, not causing further transmission conflicts.

## IV. CLUSTERING-ASSISTED MULTIGATEWAY DESIGNATION FOR REAL-TIME WSNS

Given the network, flow and performance models presented in Section III, we consider the problem of how to judi- ciously designate multiple nodes as gateways (or sinks) to enhance network schedulability in real-time WSNs. We pro- pose a framework combining spectral clustering, which is conveniently position-agnostic, with centrality metrics. By doing this, we also generalize to arbitrary gateways the single- gateway method in [4]. We recall that our framework is intended to be used at system design time, assuming full knowledge of the network topology (graph) in the form of an adjacency matrix representing binary connectivity with lossless links. [URL 🔗](#page-0)

## A. Spectral Clustering

We built upon spectral clustering [6] to virtually partition network G in a set of k disjoint and arbitrarily shaped clusters. The key idea of the method is to leverage the eigendecom- position of the graph Laplacian matrix (L) to find solutions based on the relaxation of graph cut problems. In this work, we use the direct k-way spectral clustering algorithm proposed by Ng et al. [16] to identify groups of widely separated nodes represented by k connected subgraphs. [URL 🔗](#page-0)


## Algorithm 1 NJW Spectral Clustering [16]

Input: agraph G and the target number of clusters k

Output: a partition of k clusters  ={G1, G2,...,Gk}

- 1: Find the first k eigenvectors u1,u2,...,uk of Lnorm and sort them in the columns of U

- 2: Build matrix U = [uij]n×k based on U by normalizing each row of U using uij = u ij/ k u	2 ik

- 3: Let the ith row of the matrix U represent node vi from graph G

- 4: Apply k-means algorithm (or an equivalent method) to U and find a k-way partitioning  ={G 1,...,G n}

- 5: Form the final partition  assigning every node vi to the cluster G,ifthe ith row of U belongs to G

Different from other spectral clustering methods, the Ng– Jordan–Weiss (NJW) algorithm uses eigenvectors of the nor- malized Laplacian (Lnorm) which can be computed as follows:

Lnorm = D−1/2 · L · D−1/2

where D is the degree matrix, i.e., the diagonal matrix with

the degrees of the nodes, and L = D−A is the Laplacian, with A being the adjacency matrix of the graph. For completeness, we revisit the NJW spectral clustering method in Algorithm 1. Though step 4 uses k-means, it applies virtual distances, after the normalization in step 2, thus keeping the independence from physical positions. [URL 🔗](#page-0)

## B. Centrality-Driven Multigateway Designation

After a number of k clusters has been identified, a network centrality metric is applied per cluster to designate the respec- tive gateway as the node in the cluster with the highest centrality measure. We consider the four most common metrics in social network analysis, namely: 1) degree; 2) between- ness; 3) closeness; and 4) eigenvector centrality (EC). These are considered near optimally correlated for the purposes of benchmarking [17]. These definitions are now taken with the interpretation of being cluster centrality metrics, where each cluster G is a subgraph of G and is characterized by a clus- ter adjacency matrix A and a number of nodes N, with [URL 🔗](#page-0)

l=1 N = N. Table I summarizes the formal expressions of the four cluster centrality1 metrics when applied to a given [URL 🔗](#page-0)

node vq of cluster G, where q ∈ [1, N].

## V. PERFORMANCE EVALUATION

## A. Simulation Setup

1) Network Topologies: We consider 1000 random topolo- gies built upon the synthetic generation of network graphs.

Each topology is generated with a target node density d = 0.1 using a sparse uniformly distributed binary random matrix

of N×N, i.e., assuming lossless links, where N is the total number of network nodes, including k gateways. Without loss

of generality, we use k ={1, 3, 5} and N = 75 for all the

1Notation:degree(vq) denotes the number of edges of node vq that are

directly connected to any of the rest N−1 nodes in G; spr,s is the number of shortest paths between any pair of cluster nodes vr and vs,and spr,s(vq) is the number of those paths passing through node vq; distance(vp, vq) is the (hop-

count) shortest path distance between nodes vp and vq, with p = q ∀ vp ∈ V, where V is the set of vertices or nodes of cluster G; xj is the jth value of the eigenvector x of the subgraph G,and λmax(A) is the largest eigenvalue of

the cluster’s adjacency matrix A = [aj,q]N×N , with aj,q being the matrix element at row j and column q.

*TABLE I*

*CLUSTER CENTRALITY METRICS*

| Metric | Definition |
| --- | --- |
| Degree |   |
| Betweenness |   |
| Closeness |   |
| Eigenvector |   |

simulation experiments, similarly to the validation carried out in [9]. [URL 🔗](#page-0)

- 2) Gateway Designation: After clusters have been created, a number of k nodes is selected as gateways using each of the cluster centrality metrics in Table I. In the absence of a better solution to compare against, a random designation of k gateways is also considered, for benchmarking. The random designation is done before clusters are created. [URL 🔗](#page-0)

- 3) Network Flows: A subset of n ∈ [1, 30] vertices is selected randomly as sensor nodes, i.e., to periodically transmit deadline-constrained data toward one of the k gateways. Each Ci is computed directly by the product of the time slot, i.e., 10 ms, and the number of hops in the path φi. Ti is harmonic and randomly generated in the range of [24, 27], as in [4]. This implies a superframe length of H = 1280 ms. Finally, Di is set implicitly, i.e., Di = Ti. [URL 🔗](#page-0)

- 4) Real-Time Assessment: We assess schedulability over a time interval equal to the superframe, i.e.,  = H, and when all the m = 16 channels are available. EDF and short- est path (Dijkstra) routing are assumed for all transmissions. Concerning i,j, we use precise computation derived from the network topology.

## B. Results and Discussion

Fig. 1 shows simulation results based on the setup described above. Fig. 1(a) presents the schedulability ratio over n flows for both the proposed multigateway designation framework (thicker lines) and a random baseline (thinner lines). As expected, results show that increasing the number of gate- ways improves schedulability in all cases. A schedulability ratio of 99% can be achieved with only 5, 5, and 6 flows [URL 🔗](#page-0)

using random designation with k = 1, 3, and 5, respectively. With our framework, these values increase to 11, 17, and 21 flows, respectively, thus an improvement of 3.5 times in the number of schedulable flows with five gateways.

Fig. 1(b) shows the network demand for one of the 1000 [URL 🔗](#page-0)

random topologies imposed by n = 25 flows over an interval equal to the hyperperiod H, for both approaches. These results confirm that our framework significantly reduces the worst case demand bounds.

Fig. 1(c) illustrates the clustering and gateway designa- tion in a concrete topology when using our framework. The clustering is coded in different colors and the corresponding designated gateway is marked with a star. [URL 🔗](#page-0)

Fig. 1(d)–(f) present the deviation (difference) in the schedulability ratio achieved by the other centrality metrics w.r.t. degree centrality, namely, betweenness centrality (BC), [URL 🔗](#page-0)

closeness centrality (CC), and EC, for k ∈{1, 3, 5}. These results should be correlated with those in Fig. 1(a). All cen- trality metrics perform equally well for low loads, given the [URL 🔗](#page-0)


*Fig. 1. (a) Schedulability ratio of 1000 random topologies with target density 0.1and k ∈{1, 3, 5}, with degree centrality versus random designation. (b) Worst case network demand (ms) in one simulated case during a hyperperiod. (c) Illustrative example of joint clustering and gateway designation. (d)–(f)*

*Schedulability ratio deviation of other centrality metrics w.r.t. degree centrality for*

low mutual interference, with all flows meeting their deadlines (100% schedulability). With high loads, mutual interference grows and all metrics perform poorly, with few or no flows meeting their deadlines (0% schedulability). The differences, in any case, small (<5%), appear when schedulability starts degrading, thus being of low interest from a system design point of view.

## VI. CONCLUSION

This letter presented a novel framework to design multi- gateway real-time WSN that improves traffic schedulability. We relied on spectral clustering unsupervised learning to pro- vide k clusters without the knowledge of nodes positions. In each cluster, the gateway was designated using network cen- trality. This generalized the work in [4] for arbitrary gateways. Simulation results using random network topologies and flows with multiple configurations showed the ability to reach 99% schedulability using five gateways with 3.5 times more flows when using our framework than using a random baseline. To the best of our knowledge, this was the first joint clustering and gateway designation method targeting schedulability in real-time TSCH WSNs. Future work will consider the use of the framework at runtime as well as the relationship between gateway designation, energy consumption, and schedulability. [URL 🔗](#page-0)

## REFERENCES

- [1] E. Sisinni, A. Saifullah, S. Han, U. Jennehag, and M. Gidlund, “Industrial Internet of Things: Challenges, opportunities, and directions,” IEEE Trans. Ind. Informat., vol. 14, no. 11, pp. 4724–4734, Nov. 2018.

- [2] D. Dujovne, T. Watteyne, X. Vilajosana, and P. Thubert, “6TiSCH: Deterministic IP-enabled Industrial Internet (of Things),” IEEE Commun. Mag., vol. 52, no. 12, pp. 36–41, Dec. 2014.

- [3] C. Lu et al., “Real-time wireless sensor-actuator networks for industrial cyber-physical systems,” Proc. IEEE, vol. 104, no. 5, pp. 1013–1024, May 2015.

- [4] M. G. Gaitan, L. Almeida, A. Figueroa, and D. Dujovne, “Impact of network centrality on the gateway designation of real-time TSCH networks,” in Proc. 17th IEEE Int. Conf. Factory Commun. Syst. (WFCS), 2021, pp. 139–142.

*k*

*∈{1, 3, 5}.*

- [5] F. Dobslaw, T. Zhang, and M. Gidlund, “QoS-aware cross- layer configuration for industrial wireless sensor networks,” IEEE Trans. Ind. Informat., vol. 12, no. 5, pp. 1679–1691, Oct. 2016.

- [6] M. C. Nascimento and A. C. De Carvalho, “Spectral methods for graph clustering—A survey,” Eur. J. Oper. Res., vol. 211, no. 2, pp. 221–231, 2011.

- [7] Y.-S. Chen, S.-Y. Chang, T.-W. Chang, and M.-J. Tsai, “Multiple sink placement with latency and reliability guarantee in lossy wireless sensor networks,” in Proc. IEEE Global Commun. Conf. (GLOBECOM), 2018, pp. 1–7.

- [8] M. Vahabi, H. R. Faragardi, and H. Fotouhi, “An analytical model for deploying mobile sinks in Industrial Internet of Things,” in Proc. IEEE Wireless Commun. Netw. Conf. Workshops (WCNCW), 2018, pp. 155–160.

- [9] L. Mottola and G. P. Picco, “MUSTER: Adaptive energy-aware multi- sink routing in wireless sensor networks,” IEEE Trans. Mobile Comput., vol. 10, no. 12, pp. 1694–1709, Dec. 2011.

- [10] A. Lang, Y. Wang, C. Feng, E. Stai, and G. Hug, “Data aggregation point placement for smart meters in the smart grid,” IEEE Trans. Smart Grid, vol. 13, no. 1, pp. 541–554, Jan. 2022. [URL 🔗](#page-0)

- [11] B. Xing, M. Deshpande, S. Mehrotra, and N. Venkatasubramanian, “Gateway designation for timely communications in instant mesh networks,” in Proc. 8th IEEE Int. Conf. Pervasive Comput. Commun. Workshops (PERCOM Workshops), 2010, pp. 564–569. [URL 🔗](#page-0)

- [12] M. G. Gaitan and P. M. Yomsi, “FF-DBF-WIN: On the forced-forward demand-bound function analysis for wireless industrial networks,” in Proc. Work Prog. Session 30th Euromicro Conf. Real-Time Syst. (ECRTS), 2018, pp. 13–15. [URL 🔗](#page-0)

- [13] M. G. Gaitan, P. M. Yomsi, P. M. Santos, and L. Almeida, “Work- in-progress: Assessing supply/demand-bound based schedulability tests for wireless sensor-actuator networks,” in Proc. 16th IEEE Int. Conf. Factory Commun. Syst. (WFCS), 2020, pp. 1–4. [URL 🔗](#page-0)

- [14] S. Baruah, V. Bonifaci, A. Marchetti-Spaccamela, and S. Stiller, “Improved multiprocessor global schedulability analysis,” Real-Time Syst., vol. 46, no. 1, pp. 3–24, 2010. [URL 🔗](#page-0)

- [15] C. Xia, X. Jin, and P. Zeng, “Resource analysis for wireless industrial networks,” in Proc. 12th Int. Conf. Mobile Ad-Hoc Sens. Netw. (MSN), 2016, pp. 424–428. [URL 🔗](#page-0)

- [16] A. Ng, M. Jordan, and Y. Weiss, “On spectral clustering: Analysis and an algorithm,” in Advances in Neural Information Processing Systems, vol. 14. Red Hook, NY, USA: Curran Assoc., 2001. [URL 🔗](#page-0)

- [17] T. W. Valente, K. Coronges, C. Lakon, and E. Costenbader, “How cor- related are network centrality measures?” Connections, vol. 28, no. 1, p. 16, 2008. [URL 🔗](#page-0)
