# CoursePath

**Live app:** https://burak33bb.github.io/coursepath/  
**Source:** https://github.com/burak33bb/coursepath

CoursePath turns official course catalog prerequisite statements into an inspectable course sequence. A learner supplies up to five desired courses, official catalog URLs, and completed course codes. GenLayer validators independently extract the prerequisite groups, reconcile the extracted catalog evidence, and the contract deterministically checks the selected dependency graph before saving an append-only plan.

## What makes the contract central

The contract reads each provided catalog page through GenLayer's nondeterministic web renderer, checks that each cited excerpt appears in the fetched text, uses comparative equivalence to agree on course identity and AND/OR prerequisite groups, then applies deterministic graph logic. It rejects unknown or duplicated course IDs, malformed source evidence, and self prerequisites. It returns missing prerequisites, cycles, ambiguous source sections, and a topological order. The app submits real `review_plan` transactions and reads plan history from the same contract.

An AND group means every group must be satisfied; codes within a group are alternatives. For example, `[["CS312"],["M408C","M408K"]]` means CS312 and either M408C or M408K. The planner uses a selected course where possible and then sorts the resulting dependency graph. An incomplete result is deliberately visible rather than presented as an enrollment-ready schedule.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run check
npm run build
npm run dev
```

Open the Vite URL, connect a wallet on GenLayer Studionet, deploy `contracts/course_path_planner.py` in GenLayer Studio, paste the deployed address, and submit a plan. The **Load UT Austin example** button uses the official [Computer Science catalog](https://catalog.utexas.edu/courses/c_s/) page for CS 312 and CS 314, with M408C marked as completed. Confirm the current catalog text and completed-course assumption before submitting.

## Limitations

Catalog prerequisite prose can include grade thresholds, co-requisites, placement, transfer equivalencies, honors rules, or program-specific exceptions beyond a simple dependency graph. CoursePath preserves excerpts and the official source URL but does not model every institutional rule, check a student's transcript, guarantee seat availability, register a student, or replace an academic advisor. Completed courses are user-reported. Verify the linked catalog before acting. Each deployment stores up to 200 plans.

## License

MIT. See [LICENSE](LICENSE).
