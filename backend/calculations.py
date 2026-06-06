import math


def calculate_job(
    order_quantity: int,
    ups: int,
    sheet_length: float,
    sheet_width: float,
    gsm: int,
) -> dict:
    base_sheets = math.ceil(order_quantity / ups)

    if base_sheets < 5000:
        wastage_pct = 10.0
    elif base_sheets <= 7500:
        wastage_pct = 7.0
    else:
        wastage_pct = 5.0

    final_sheets = math.ceil(base_sheets * (1 + wastage_pct / 100))
    total_kg = round(
        ((sheet_length * sheet_width * gsm) / 20000 / 500) * final_sheets, 2
    )

    return {
        "base_sheets": base_sheets,
        "wastage_percentage": wastage_pct,
        "final_sheets": final_sheets,
        "total_kg": total_kg,
    }
