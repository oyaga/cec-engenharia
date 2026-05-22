import pandas as pd

file_path = "/Users/piticalyn/Adriano macias/Planilha Geral T1 MC.xlsx"
sheets = ['Ficha de Matrícula (impressão)', 'Recibo', 'Declaração de inscrito', 'Declaração de término', 'Contrato pág1', 'Contrato pág2', 'Contrato pág3']

try:
    xl = pd.ExcelFile(file_path)
    for sheet in sheets:
        if sheet in xl.sheet_names:
            print(f"--- {sheet} ---")
            df = xl.parse(sheet, header=None)
            for _, row in df.iterrows():
                row_vals = [str(x).strip() for x in row.values if pd.notna(x) and str(x).strip() != '']
                if row_vals:
                    text_line = " | ".join(row_vals)
                    print(text_line)
            print("\n")
except Exception as e:
    print("Error:", e)
