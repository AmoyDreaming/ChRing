import pymysql

conn = pymysql.connect(host="127.0.0.1",port=3306,user="root",passwd="",db="plant")
cur=conn.cursor()
cur.execute('select * from t_sample_desc')
for row in cur:
    print(row)
cur.close()
conn.close()