import viz3danim
import sys

if __name__ == '__main__':
    if len(sys.argv)>1:
        fileNames=sys.argv[1:]
        viz3danim.show(filenames=fileNames)
    else:
        viz3danim.show()
