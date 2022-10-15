import os 
import json 
from typing import List, Dict 
import urllib.parse 

# ====
# Global variable
# ====
MAIN_PAGE = './README.md' 

CONFIG_JSON = None 
with open('./config.json', 'r') as f: 
    CONFIG_JSON = json.load(f) 
assert(isinstance(CONFIG_JSON, Dict)) 

# ====
# Utils 
# ====
def make_md_link (label :str, link_url :str): 
    return '[{}]({})'.format(label, urllib.parse.quote(link_url))

# ====
# Work on a sub folder
# ====
def work_on_sub_folder(
    page_title :str, 
    sub_folder_name :str
): 
    assert(os.path.isdir(sub_folder_name))

    # locate the config 
    config_json = None 
    config_json_file = os.path.join(sub_folder_name, 'config.json') 
    if (os.path.isfile(config_json_file)): 
        with open(config_json_file, 'r') as f: 
            config_json = json.load(f)

    # locate the main page 
    sub_main_page = os.path.join(sub_folder_name, 'README.md') 

    # generate the file list 
    file_list = os.listdir(sub_folder_name) 
    file_links = [] 

    for fname in file_list: 
        if (not fname.endswith('.md')): 
            continue 

        if (fname in ['README.md']): 
            continue 
            
        if (isinstance(config_json, Dict) and 'excluded_files' in config_json and fname in config_json['excluded_files']): 
            continue 

        link_name = fname[:-3] 
        link_url = fname[:-3]
        if (isinstance(config_json, Dict) and 'link_renamings' in config_json and fname in config_json['link_renamings']): 
            link_name = config_json['link_renamings'][fname]

        file_links.append({
            'name': link_name, 
            'url': link_url 
        })

    file_links.sort(key=lambda fl: fl['name']) 

    # write the file 
    with open(sub_main_page, 'w') as f: 
        # write the title 
        f.write(f'## {page_title}')
        f.write('\n\n')

        # write the file 
        for fl in file_links: 
            f.write('* {}'.format(make_md_link(fl['name'], fl['url'])))
            f.write('\n\n')

# ====
# Main 
# ====
with open(MAIN_PAGE, 'w') as f: 
    pass 
    
    # Write the title 
    f.write("# Love the Word")
    f.write('\n\n') 

    # My proclaim of faith 
    f.write(make_md_link('信仰宣告', './faith'))
    f.write('\n\n') 

    # Loop through the writings 
    f.write('## Writings')
    f.write('\n\n') 

    for sf in CONFIG_JSON['writings']: 
        f.write('* {}'.format(make_md_link(sf['name'], sf['path'])))
        f.write('\n\n') 

        if (sf['type'] == 'folder'): 
            work_on_sub_folder(page_title=sf['name'], sub_folder_name=sf['path'])