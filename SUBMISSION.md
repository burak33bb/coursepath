# Project submission draft — CoursePath

## Title

CoursePath: Consensus-checked course prerequisite planner

## Short description

CoursePath reads official course catalog pages, reconciles prerequisite groups through GenLayer consensus, and stores an evidence-backed course sequence in a shared Intelligent Contract registry.

## Project description

Catalog prerequisites are often written across long catalog pages with alternative requirements and exceptions. CoursePath lets a student plan a small set of courses from official catalog URLs and mark completed course codes. GenLayer validators independently inspect each catalog page, extract course identity and AND/OR prerequisite groups, and reconcile those findings through comparative equivalence. The contract then applies deterministic dependency-graph checks, reports missing prerequisites, unclear catalog sections, and cycles, and computes a topological course order when possible. The browser app submits real contract calls and reads shared plan history from GenLayer.

Every plan retains catalog URLs and evidence excerpts. The contract checks that quoted excerpts occur in fetched source text and refuses to label unclear prerequisite sections as ready. CoursePath does not enroll students, verify transcripts, or replace academic advising; completed courses are user-reported and institutional exceptions require human review.

## Deployment references

- Add the public repository and live app URLs to the Project submission form.
- Add the deployed GenLayer Studionet contract address and finalized example transaction hash after deployment.
- Catalog example: University of Texas at Austin CS course catalog, `https://catalog.utexas.edu/courses/c_s/`

## Reviewer walkthrough

1. Open the live app and connect to the deployed planner.
2. Use **Load UT Austin example** to fill CS 312, CS 314, and completed M408C.
3. Connect the contract and wallet on GenLayer Studionet.
4. Submit **Check catalog requirements** and inspect the finalized transaction.
5. Expand catalog evidence and confirm the generated order and prerequisite excerpts.

