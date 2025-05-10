import random
import string
import pandas as pd

# 定义数据生成参数
TOTAL_STUDENTS = 45000  # 学生总数
TOTAL_TEACHERS = 5000   # 教师总数
OUTPUT_FILE = "massive_user_data.xlsx"

# 姓氏列表
surnames = [
    "李", "王", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴",
    "徐", "孙", "马", "朱", "胡", "郭", "何", "高", "林", "郑",
    "罗", "宋", "谢", "唐", "韩", "曹", "许", "邓", "萧", "冯",
    "曾", "程", "蔡", "彭", "潘", "袁", "于", "董", "余", "苏",
    "叶", "吕", "魏", "蒋", "田", "杜", "丁", "沈", "姜", "范"
]

# 常见名字
common_names = [
    "伟", "芳", "娜", "秀英", "敏", "静", "丽", "强", "磊", "军",
    "洋", "勇", "艳", "杰", "娟", "涛", "明", "超", "秀兰", "霞",
    "平", "刚", "桂英", "玲", "桂兰", "建华", "建国", "建军", "建平", "建设",
    "文", "辉", "飞", "鹏", "俊", "健", "峰", "华", "佳", "倩",
    "宁", "婷", "燕", "子", "琴", "云", "莉", "兰", "凤", "洁",
    "梅", "琳", "雪", "松", "丹", "淑珍", "淑兰", "淑英", "淑华", "淑芬"
]

# 院系列表
departments = [
    "计算机学院", "机械学院", "电子信息学院", "材料科学学院", "土木工程学院",
    "化学工程学院", "生物工程学院", "环境工程学院", "自动化学院", "数学学院",
    "物理学院", "经济管理学院", "外国语学院", "人文学院", "艺术设计学院",
    "医学院", "法学院", "新闻传播学院", "体育学院", "音乐学院"
]

# 教师头衔
teacher_titles = ["教授", "副教授", "讲师", "助教", "博士", "研究员"]

def generate_name():
    """生成随机中文姓名"""
    surname = random.choice(surnames)
    if random.random() < 0.3:  # 30%的概率生成单字名
        name = random.choice(common_names)
    else:  # 70%的概率生成双字名
        name = random.choice(common_names) + random.choice(common_names)
    return surname + name

def generate_id_number():
    """生成随机18位身份证号码格式"""
    # 简化处理，实际身份证有更复杂的规则
    return ''.join(random.choices(string.digits, k=18))

def generate_student_data(start_year=2018, end_year=2023):
    """生成学生数据"""
    students = []
    student_id = 1

    for year in range(start_year, end_year + 1):
        year_prefix = str(year)
        students_per_year = TOTAL_STUDENTS // (end_year - start_year + 1)

        for _ in range(students_per_year):
            username = f"{year_prefix}{str(student_id).zfill(3)}"
            name = generate_name()
            department = random.choice(departments)
            id_number = generate_id_number()

            students.append({
                "username": username,
                "name": name,
                "department": department,
                "role": "student",
                "id_number": id_number
            })

            student_id += 1
            if student_id > 999:
                student_id = 1

    return students

def generate_teacher_data(start_year=2018, end_year=2023):
    """生成教师数据"""
    teachers = []
    teacher_id = 1

    for year in range(start_year, end_year + 1):
        year_prefix = str(year)
        teachers_per_year = TOTAL_TEACHERS // (end_year - start_year + 1)

        for _ in range(teachers_per_year):
            username = f"T{year_prefix}{str(teacher_id).zfill(3)}"
            name = generate_name() + random.choice(teacher_titles)
            department = random.choice(departments)
            id_number = generate_id_number()

            teachers.append({
                "username": username,
                "name": name,
                "department": department,
                "role": "teacher",
                "id_number": id_number
            })

            teacher_id += 1
            if teacher_id > 999:
                teacher_id = 1

    return teachers

def write_data_to_file(data, filename):
    """将数据写入Excel文件"""
    # 将数据列表转换为DataFrame
    df = pd.DataFrame(data)

    # 将DataFrame保存为Excel文件
    df.to_excel(filename, index=False)

def main():
    # 生成学生数据
    students = generate_student_data()

    # 生成教师数据
    teachers = generate_teacher_data()

    # 合并数据
    all_data = students + teachers

    # 随机打乱数据顺序
    random.shuffle(all_data)

    # 写入文件
    write_data_to_file(all_data, OUTPUT_FILE)

    print(f"已生成 {len(students)} 条学生记录和 {len(teachers)} 条教师记录，共 {len(all_data)} 条数据")
    print(f"数据已保存到 {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
