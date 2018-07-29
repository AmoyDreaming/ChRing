import pymysql
import pymongo

# connect mysql
conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', passwd='', db='plant')
cur = conn.cursor()

# connect mongo
client = pymongo.MongoClient('localhost', 27017)
db = client['arab']
collection = db['chloroplast']

# convert data from mysql to mongo
# 1.gene part
cur.execute('select * from t_arab_gff where chr="chloroplast"')
for row in cur:
    start = row[3]
    end = row[4]
    gene = row[6]
    type = row[7]
    collection.insert_one({
        'gene': gene,
        'type': type,
        'start': start,
        'end': end
    })

# 2.pa part
sample1 = ['wtleaf1', 'wtleaf2', 'wtleaf3', 'wtseed1', 'wtseed2', 'wtroot1', 'wtroot2', 'wtroot3']
sample2 = ['oxtroot1', 'oxtroot2', 'oxtroot3', 'oxtleaf1', 'oxtleaf2', 'oxtleaf3']
docs = collection.find()
for doc in docs:
    start = doc['start']
    end = doc['end']
    pas = []
    cur.execute('select * from t_arab_pa1 where chr="chloroplast" and coord between %d and %d' % (start, end))
    for row in cur:
        score = {}
        for index, value in enumerate(row[4:]):
            if value != 0:
                score[sample1[index]] = value
        pas.append({'coord': row[2], 'total': row[3], 'score': score})
    cur.execute('select * from t_arab_pa2 where chr="chloroplast" and coord between %d and %d' % (start, end))
    for row in cur:
        if len([item for item in pas if item['coord'] == row[2]]):
            idx = [idx for (idx, item) in enumerate(pas) if item['coord'] == row[2]][0]
            pas[idx]['total'] += row[3]
            score = pas[idx]['score']
            for index, value in enumerate(row[4:]):
                if value != 0:
                    score[sample2[index]] = value
            pas[idx]['score'] = score
        else:
            score = {}
            for index, value in enumerate(row[4:]):
                if value != 0:
                    score[sample2[index]] = value
            pas.append({'coord': row[2], 'total': row[3], 'score': score})
    collection.find_one_and_update({'_id': doc['_id']}, {'$set': {'pas': pas}})

# database will close automatically when program ends
