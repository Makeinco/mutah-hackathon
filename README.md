# MUTAH | مُتاح
## MUTAH MAP | مُتاح ماب

**اعرف قبل أن تصل · Know Before You Go**

MUTAH MAP is an evidence-first accessibility decision prototype created for the AI Hackathon for People with Disabilities. It helps people understand key physical-access conditions before arriving at a facility.

**Live build:** https://mutah.vercel.app

## The problem

People often discover accessibility barriers only after reaching a destination. MUTAH turns that uncertainty into structured, reviewable information before the journey.

## The solution

MUTAH MAP combines facility evidence, AI-assisted observation, contributor input, and human verification to publish clearer accessibility information without overstating what the evidence proves.

**AI Observes. Humans Verify.**

**Not Visible ≠ Absent.**

## Current MVP scope

The current product focuses on physical-access evidence across five facility zones:

- Approach / مسار الوصول
- Entrance / المدخل
- Parking / المواقف
- Elevator / المصعد
- Restroom / دورة المياه المخصصة

User-facing access needs include:

- Step-free route / مسار بلا درجات
- Ramp / منحدر
- Obstacle-free path / مسار خالٍ من العوائق
- Handrail / درابزين
- Accessible parking / موقف مخصص
- Elevator / مصعد
- Accessible restroom / دورة مياه مخصصة

## Evidence model

MUTAH preserves uncertainty instead of turning incomplete evidence into a false conclusion. Evidence can be represented as:

- `present`
- `absent`
- `unknown`
- `not_visible`
- `not_documented`
- `conflicting`
- `not_applicable`

The product does not provide a universal accessibility score, does not claim legal compliance or certification, and does not infer exact physical dimensions from images.

## Workflow

`Facility → Zone → Evidence → AI observation → Contributor confirmation → Human review → Published facility evidence`

Public facility information is separated from private/raw evidence. Reviewed evidence is published through controlled reviewer/admin workflows.

## Architecture

- React + TypeScript
- TanStack Start
- Supabase
- Gemini Vision
- Vercel

Privileged review and administration actions are enforced through authenticated database/RPC and storage controls rather than source-code secrecy.

## Local development

Install dependencies and run the project using the package scripts defined in the repository.

Typical environment variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
GEMINI_API_KEY=
```

Do not commit real credentials or local environment files.

## Current product vs. future expansion

The current hackathon MVP demonstrates the MUTAH MAP accessibility-evidence workflow. Future expansion may extend the same approach to additional everyday and high-impact destinations, but those future contexts are not presented as current coverage.

## Data honesty

Do not present prototype/sample information, partnerships, integrations, coverage, model output, legal compliance, or accessibility certification as verified reality unless explicitly supported by reviewed evidence.

## Repository note

This repository contains the hackathon implementation of MUTAH. The verified live product is available at:

https://mutah.vercel.app

MUTAH brand assets, logos, imagery, video, guide illustrations, and visual identity materials are owned by Makein.

© Makein. All rights reserved for MUTAH brand and media assets.

## License and asset use

The source code is licensed under the [MIT License](LICENSE).

MUTAH brand and media assets are proprietary Makein materials and are not licensed under MIT. See [NOTICE](NOTICE) and [ASSET_PROVENANCE.md](ASSET_PROVENANCE.md).
