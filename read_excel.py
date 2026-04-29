import pandas as pd

df = pd.read_excel(r'd:\edu_dist_standalone\New folder\TeacherDB.xlsx')
print(df.columns.tolist())
print(df.head(2).to_dict('records'))
