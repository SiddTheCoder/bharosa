"""T9 — Psychometric interview question bank (Sensor 2).

Six localized situational-judgement items over two traits that predict
repayment: conscientiousness (planning, follow-through) and risk_aversion
(prudence with money). Reverse-coded items guard against acquiescence bias —
their raw favorability is flipped before folding into the belief.
"""
from __future__ import annotations

QUESTIONS: list[dict] = [
    {
        "id": "q1_planning",
        "trait": "conscientiousness",
        "reverse_coded": False,
        "text_en": "Your shop earns more than usual one month. What do you do with the extra money?",
        "text_ne": "कुनै महिना तपाईंको पसलले सामान्यभन्दा बढी कमायो भने त्यो थप पैसा के गर्नुहुन्छ?",
    },
    {
        "id": "q2_followthrough",
        "trait": "conscientiousness",
        "reverse_coded": False,
        "text_en": "A supplier offers stock on credit, to be repaid in 30 days. How do you make sure you repay on time?",
        "text_ne": "एक आपूर्तिकर्ताले ३० दिनभित्र तिर्ने सर्तमा उधारोमा सामान दिन्छ। तपाईं समयमै तिर्ने कुरा कसरी सुनिश्चित गर्नुहुन्छ?",
    },
    {
        "id": "q3_impulse",
        "trait": "conscientiousness",
        "reverse_coded": True,
        "text_en": "When you have cash in hand, you usually spend it quickly rather than saving it. Is that true for you?",
        "text_ne": "हातमा नगद हुँदा तपाईं प्रायः बचत गर्नुभन्दा छिटो खर्च गर्नुहुन्छ। के यो तपाईंको हकमा साँचो हो?",
    },
    {
        "id": "q4_prudence",
        "trait": "risk_aversion",
        "reverse_coded": False,
        "text_en": "A neighbour suggests a business that could double your money but might lose it all. Would you put your savings into it?",
        "text_ne": "एक छिमेकीले पैसा दोब्बर हुनसक्ने तर सबै गुम्न पनि सक्ने व्यवसाय सुझाव दिन्छ। के तपाईं आफ्नो बचत त्यसमा लगाउनुहुन्छ?",
    },
    {
        "id": "q5_buffer",
        "trait": "risk_aversion",
        "reverse_coded": False,
        "text_en": "Do you keep some money aside for emergencies, separate from your daily business cash?",
        "text_ne": "के तपाईं दैनिक व्यवसायको नगदभन्दा अलग, आपतकालका लागि केही पैसा छुट्याएर राख्नुहुन्छ?",
    },
    {
        "id": "q6_gamble",
        "trait": "risk_aversion",
        "reverse_coded": True,
        "text_en": "You enjoy taking big financial chances even when the outcome is very uncertain. Does this describe you?",
        "text_ne": "नतिजा एकदमै अनिश्चित हुँदा पनि तपाईं ठूला आर्थिक जोखिम लिन रमाउनुहुन्छ। के यसले तपाईंलाई वर्णन गर्छ?",
    },
]

QUESTIONS_BY_ID: dict[str, dict] = {q["id"]: q for q in QUESTIONS}


def get_question(question_id: str) -> dict | None:
    return QUESTIONS_BY_ID.get(question_id)
