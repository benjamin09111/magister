from typing import List, Dict, Any, Tuple

def build_tsch_schedule(
    paths: Dict[str, List[int]],
    sensors: List[int],
    gateway: int,
    T: List[int],
    D: List[int],
    H: int,
    m: int,
    w_slots: int = 2
) -> Tuple[List[Dict[str, Any]], bool]:
    """
    Builds a concrete TSCH schedule grid (Timeslot x Channel) using EDF heuristic.
    Allocates cell slots and channels for all flow transmissions across the hyperperiod H.
    """
    # 1. Create a dictionary of periods and deadlines per sensor
    flow_params = {}
    for idx, sensor in enumerate(sensors):
        sensor_str = str(sensor)
        flow_params[sensor_str] = {
            "path": paths[sensor_str],
            "period": T[idx],
            "deadline": D[idx]
        }
        
    # 2. Generate all transmission tasks for all jobs in the hyperperiod H
    # A task represents 1 hop transmission for a specific job of a flow.
    tasks = []
    for sensor_str, params in flow_params.items():
        path = params["path"]
        period = params["period"]
        deadline_rel = params["deadline"]
        
        # Calculate number of jobs in H
        num_jobs = H // period
        for job_idx in range(num_jobs):
            job_start = job_idx * period
            job_deadline = job_start + deadline_rel
            
            # Create a task for each hop along the path
            job_tasks = []
            for hop_idx in range(len(path) - 1):
                sender = path[hop_idx]
                receiver = path[hop_idx + 1]
                
                task = {
                    "id": f"{sensor_str}_job{job_idx}_hop{hop_idx}",
                    "sensor": sensor_str,
                    "job": job_idx,
                    "hop": hop_idx,
                    "sender": sender,
                    "receiver": receiver,
                    "ready_time": job_start, # will be updated as previous hops finish
                    "deadline": job_deadline,
                    "duration": w_slots,
                    "scheduled": False,
                    "start_slot": -1,
                    "channel": -1
                }
                job_tasks.append(task)
            tasks.append(job_tasks)
            
    # Flat structure for scheduling, but we keep the group dependencies
    # We will schedule hop-by-hop. A hop h of job j can only be scheduled
    # if hop h-1 of job j is already scheduled.
    
    # 3. Initialize node busy state and channel capacity arrays
    # node_busy[node][slot] = True if node is transmitting or receiving in that slot
    node_busy = {}
    for task_list in tasks:
        for task in task_list:
            node_busy[task["sender"]] = [False] * H
            node_busy[task["receiver"]] = [False] * H
            
    # channel_slots[slot] = list of channels allocated in this slot (max length m)
    channel_slots = [[] for _ in range(H)]
    
    # 4. Schedule step-by-step
    # We loop through time slots from 0 to H-1
    for slot in range(H):
        # Find all unscheduled tasks that are ready to be scheduled at or before this slot
        ready_tasks = []
        for job_tasks in tasks:
            for hop_idx, task in enumerate(job_tasks):
                if task["scheduled"]:
                    continue
                # If it's the first hop, it depends on its job start time
                # If it's a subsequent hop, it depends on the previous hop completing
                if hop_idx == 0:
                    is_ready = (slot >= task["ready_time"])
                else:
                    prev_task = job_tasks[hop_idx - 1]
                    is_ready = prev_task["scheduled"] and (slot >= prev_task["start_slot"] + prev_task["duration"])
                    if is_ready:
                        task["ready_time"] = prev_task["start_slot"] + prev_task["duration"]
                        
                if is_ready:
                    ready_tasks.append((task, job_tasks))
                    # Only look at the first unscheduled hop for each job
                    break
                    
        # Sort ready tasks by absolute deadline (EDF)
        ready_tasks.sort(key=lambda x: x[0]["deadline"])
        
        # Try to schedule each ready task in this slot
        for task, job_tasks in ready_tasks:
            # Check if this task can be scheduled starting at current 'slot'
            # Must fit duration w_slots, must not exceed H, must not exceed deadline
            duration = task["duration"]
            if slot + duration > H:
                continue # cannot fit in hyperperiod
                
            # Check node and channel availability for all 'duration' slots
            can_schedule = True
            for s_offset in range(duration):
                check_slot = slot + s_offset
                
                # Node conflict check: sender or receiver busy in this slot
                if node_busy[task["sender"]][check_slot] or node_busy[task["receiver"]][check_slot]:
                    can_schedule = False
                    break
                    
                # Channel limit check: all channels busy in this slot
                if len(channel_slots[check_slot]) >= m:
                    can_schedule = False
                    break
                    
            if can_schedule:
                # Find a free channel that is available for all 'duration' slots
                # A channel is free if it's not in channel_slots[check_slot] for any check_slot
                allocated_channel = -1
                for ch in range(m):
                    ch_free = True
                    for s_offset in range(duration):
                        check_slot = slot + s_offset
                        if ch in channel_slots[check_slot]:
                            ch_free = False
                            break
                    if ch_free:
                        allocated_channel = ch
                        break
                        
                if allocated_channel != -1:
                    # Allocate!
                    task["start_slot"] = slot
                    task["channel"] = allocated_channel
                    task["scheduled"] = True
                    
                    # Mark nodes as busy and record channel usage
                    for s_offset in range(duration):
                        check_slot = slot + s_offset
                        node_busy[task["sender"]][check_slot] = True
                        node_busy[task["receiver"]][check_slot] = True
                        channel_slots[check_slot].append(allocated_channel)
                        
    # 5. Compile the grid and check if all tasks were scheduled before their deadlines
    grid = []
    all_scheduled = True
    
    for job_tasks in tasks:
        for task in job_tasks:
            if not task["scheduled"]:
                all_scheduled = False
                continue
                
            # Check if it missed the deadline
            completion_time = task["start_slot"] + task["duration"]
            if completion_time > task["deadline"]:
                all_scheduled = False # missed deadline
                
            # Add to grid representation for each occupied cell
            for s_offset in range(task["duration"]):
                grid.append({
                    "slot": task["start_slot"] + s_offset,
                    "channel": task["channel"],
                    "sender": task["sender"],
                    "receiver": task["receiver"],
                    "sensor": task["sensor"],
                    "job": task["job"],
                    "hop": task["hop"],
                    "deadline": task["deadline"]
                })
                
    return grid, all_scheduled
