class EmailAgent:
    signature = """Warm regards,

EI THANDAR KHAING, Learning Management
e: eithandar@educlaas.com
o: +959 798469301
w: www.claas2saas.com

a: 11 Eunos Road 8, #07-02 Lifelong Learning Institute, Singapore 408601"""

    def generate(self, analysis: dict) -> list[dict]:
        actions = analysis.get("action_items", [])
        concerns = analysis.get("delivery_concerns") or analysis.get("risks") or []
        blockers = analysis.get("blockers") or []
        risks = analysis.get("risks") or []
        next_steps = analysis.get("recommendations") or ["Confirm ownership, timelines, and stakeholder communication before the next delivery checkpoint."]
        preparation = analysis.get("next_meeting_preparation") or ["Review action status and confirm that any delivery-critical risks have been unblocked."]
        stakeholder_followups = analysis.get("stakeholder_followups") or []
        summary = analysis.get("manager_summary") or analysis.get("summary") or "The meeting covered operational readiness, open delivery items, and next steps for the learning delivery plan."

        manager_body = "\n\n".join(
            [
                "Hi Manager,",
                "Summary of Meeting",
                summary,
                "Issues / Risks",
                self._sentence_list(concerns or risks or blockers, "No critical risks were captured, but delivery readiness should still be monitored through the next checkpoint.") + ".",
                "Action Taken",
                self._actions_narrative(actions, manager_view=True),
                "Need Approval",
                self._sentence_list(stakeholder_followups or next_steps, "Please advise if management approval or stakeholder guidance is required for any open dependency.") + ".",
                "Closing",
                "I will continue tracking the open items and escalate anything that affects learner readiness, delivery timing, or stakeholder communication.",
                self.signature,
            ]
        )

        team_body = "\n\n".join(
            [
                "Hi Team,",
                "Summary of Meeting",
                analysis.get("summary") or summary,
                "Issues / Risks",
                self._sentence_list(concerns or risks or blockers, "No major risks were captured, but please continue checking readiness items in your area.") + ".",
                "Areas for Improvement",
                self._actions_narrative(actions, manager_view=False),
                "Preparation for Next Meeting",
                self._sentence_list(preparation, "Please come prepared with action status, blockers, and decisions needed from stakeholders.") + ".",
                "Closing",
                "Please reply if any owner, deadline, or dependency needs to be corrected so we can keep the delivery plan accurate.",
                self.signature,
            ]
        )

        learner_body = "\n\n".join(
            [
                "Hi Learner,",
                "Consultation Summary",
                analysis.get("summary") or summary,
                "Learner Progress Discussion",
                self._sentence_list(concerns or risks or blockers, "We discussed your current progress and any areas where additional support may be helpful.") + ".",
                "Agreed Follow-up Actions",
                self._actions_narrative(actions, manager_view=False),
                "Next Steps",
                self._sentence_list(preparation or next_steps, "Please continue with the agreed next steps and prepare any updates for the next checkpoint.") + ".",
                "Encouragement & Support",
                "Please do not hesitate to ask for support if anything is unclear. The goal is to help you stay on track and complete the required learning outcomes.",
                "Closing",
                "Please reply if you have questions or need further guidance.",
                self.signature,
            ]
        )

        return [
            {
                "email_type": "manager_report",
                "subject": "Manager Update: Delivery Risks, Actions, and Approvals Needed",
                "body": manager_body,
            },
            {
                "email_type": "team_follow_up",
                "subject": "Team Follow-up: Actions, Risks, and Next Meeting Preparation",
                "body": team_body,
            },
            {
                "email_type": "learner_consultation",
                "subject": "Learner Consultation Follow-up: Progress, Actions, and Support",
                "body": learner_body,
            },
        ]

    def _paragraph(self, text: str) -> str:
        return " ".join(text.split())

    def _sentence_list(self, items: list, fallback: str) -> str:
        cleaned = [str(item).strip().rstrip(".") for item in items if str(item).strip()]
        if not cleaned:
            return fallback
        if len(cleaned) == 1:
            return cleaned[0]
        return ", ".join(cleaned[:-1]) + f", and {cleaned[-1]}"

    def _actions_narrative(self, actions: list[dict], manager_view: bool) -> str:
        if not actions:
            return (
                "No specific action owners were captured in the meeting record, so the immediate next step is to confirm ownership, deadlines, "
                "and escalation paths before the next delivery checkpoint."
            )

        action_sentences = []
        for item in actions[:6]:
            task = item.get("task") or "the assigned follow-up"
            owner = item.get("owner") or "the assigned owner"
            deadline = item.get("deadline") or "the agreed deadline"
            priority = item.get("priority") or "Medium"
            action_sentences.append(f"{owner} will own {task}, with a target of {deadline} and {priority.lower()} priority")

        lead = (
            "The agreed actions are important because they protect delivery readiness and give leadership clearer visibility into the remaining dependencies. "
            if manager_view
            else "The agreed actions are the main items we need to keep moving before the next checkpoint. "
        )
        return lead + self._sentence_list(action_sentences, "ownership and timelines should be confirmed") + "."
