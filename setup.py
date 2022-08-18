from setuptools import setup, find_packages
from os.path import basename, splitext
from glob import glob

setup(
    packages=find_packages('src'),
    package_dir={'': 'src'},
    py_modules=[splitext(basename(path))[0] for path in glob('src/*.py')],
)
