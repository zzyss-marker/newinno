import pandas as pd
import sys

def check_duplicates(file_path):
    try:
        # 读取Excel文件
        df = pd.read_excel(file_path)
        
        # 获取第一列数据
        first_column = df.iloc[:, 0]
        
        # 检查重复项
        duplicates = first_column[first_column.duplicated()]
        
        if not duplicates.empty:
            print("发现重复项:")
            print(duplicates.to_string(index=False))
            print(f"\n总重复项数量: {len(duplicates)}")
        else:
            print("第一列中没有发现重复项。")
    except Exception as e:
        print(f"处理文件时出错: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("用法: python check_excel_duplicates.py <Excel文件路径>")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    check_duplicates(excel_file)