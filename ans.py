# import the necessary packages
import sys
from imutils.perspective import four_point_transform
from imutils import contours
import numpy as np
import argparse
import imutils
import cv2

ans = []




def ResizeWithAspectRatio(image, width=None, height=None, inter=cv2.INTER_AREA):
    dim = None
    (h, w) = image.shape[:2]

    if width is None and height is None:
        return image
    if width is None:
        r = height / float(h)
        dim = (int(w * r), height)
    else:
        r = width / float(w)
        dim = (width, int(h * r))

    return cv2.resize(image, dim, interpolation=inter)










# construct the argument parse and parse the arguments
ap = argparse.ArgumentParser()
ap.add_argument("-i", "--image", required=True,
	help="path to the input image")
args = vars(ap.parse_args())



# load the image, convert it to grayscale, blur it
# slightly, then find edges
imgpath = './sessions/' + args["image"].strip()
imageOr = cv2.imread(imgpath)
image = ResizeWithAspectRatio(imageOr, width=600)     
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
blurred = cv2.GaussianBlur(gray, (5, 5), 0)
edged = cv2.Canny(blurred, 75, 200)






# find contours in the edge map, then initialize
# the contour that corresponds to the document
cnts = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL,
	cv2.CHAIN_APPROX_SIMPLE)
cnts = imutils.grab_contours(cnts)
docCnt = None


# ensure that at least one contour was found
if len(cnts) > 0:

	# sort the contours according to their size in
	# descending order
	cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

	# loop over the sorted contours
	for c in cnts:

		# approximate the contour
		peri = cv2.arcLength(c, True)
		approx = cv2.approxPolyDP(c, 0.02 * peri, True)

		# if our approximated contour has four points,
		# then we can assume we have found the paper
		if len(approx) == 4:
			docCnt = approx
			break




# apply a four point perspective transform to both the
# original image and grayscale image to obtain a top-down
# birds eye view of the paper
paper = four_point_transform(image, docCnt.reshape(4, 2))
warped = four_point_transform(gray, docCnt.reshape(4, 2))














# apply Otsu's thresholding method to binarize the warped
# piece of paper
thresh = cv2.threshold(warped, 0, 255,
	cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]


# find contours in the thresholded image, then initialize
# the list of contours that correspond to questions
cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL,
	cv2.CHAIN_APPROX_SIMPLE)
cnts = imutils.grab_contours(cnts)

# ensure that at least one contour was found
if len(cnts) > 0:

	# sort the contours according to their size in
	# descending order
	cnts = sorted(cnts, key=cv2.contourArea, reverse=True)

	# loop over the sorted contours
	for c in cnts:

		# approximate the contour
		peri = cv2.arcLength(c, True)
		approx = cv2.approxPolyDP(c, 0.02 * peri, True)

		# if our approximated contour has four points,
		# then we can assume we have found the paper
		if len(approx) == 4:
			docCnt = approx
			break

# apply a four point perspective transform to both the
# original image and grayscale image to obtain a top-down
# birds eye view of the form
paper = four_point_transform(paper, docCnt.reshape(4, 2))
warped = four_point_transform(warped, docCnt.reshape(4, 2))










boxes = []
# apply Otsu's thresholding method to binarize the warped
# piece of paper
thresh = cv2.adaptiveThreshold(warped,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,\
            cv2.THRESH_BINARY,11,6)

# find contours in the thresholded image, then initialize
# the list of contours that correspond to questions
cnts = cv2.findContours(thresh.copy(), cv2.RETR_TREE,
	cv2.CHAIN_APPROX_SIMPLE)
cnts = imutils.grab_contours(cnts)

for c in cnts:
	(x, y, w, h) = cv2.boundingRect(c)
	ar = w / float(h)
	approx = cv2.approxPolyDP(c, 0.009 * cv2.arcLength(c, True), True)
	n = approx.ravel() 	
	area = cv2.contourArea(c, True)
	

	if w >= 300 and  w <= 500 and h >= 50 and h <= 150 and ar >= 3 and ar <= 6 and area > 0:
		boxes.append(c)







boxes = contours.sort_contours(boxes, method="top-to-bottom")[0]
# loop over the contours
for box in boxes:
	x,y,w,h = cv2.boundingRect(box)
	boxim = paper[y:y+h, x:x+w]
	boximgray = warped[y:y+h, x:x+w]


	thresh = cv2.adaptiveThreshold(boximgray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY,11,6)
	thresh = cv2.threshold(boximgray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]

	cnts = cv2.findContours(thresh.copy(), cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
	cnts = imutils.grab_contours(cnts)
	rb = []
	for c in cnts:
		(x, y, w, h) = cv2.boundingRect(c)
		ar = w / float(h)
		approx = cv2.approxPolyDP(c, 0.009 * cv2.arcLength(c, True), True)
		n = approx.ravel() 	
		area = cv2.contourArea(c, True)

		if w >= 40 and  w <= 80 and h >= 40 and h <= 80 and ar >= 0.6 and ar <= 1.5 and area < 0:
			rb.append(c)


	rb = contours.sort_contours(rb, method="left-to-right")[0]
	i = 1
	curr = 0

	for b in rb:

		# construct a mask that reveals only the current
		# "bubble" for the question
		mask = np.zeros(thresh.shape, dtype="uint8")
		cv2.drawContours(mask, [b], -1, 255, -1)

		# apply the mask to the thresholded image, then
		# count the number of non-zero pixels in the
		# bubble area
		mask = cv2.bitwise_and(thresh, thresh, mask=mask)
		total = cv2.countNonZero(mask)

		#cv2.drawContours(boxim, rb, -1, 242526, 3)
		#cv2.imshow("mask", mask)
		#cv2.waitKey(0)
		
		if total > 1200:
			curr = i
			ans.append(i)

		if i == 4 and curr == 0:
			ans.append(0)

		i+=1
		

	
	
	

print(ans)
sys.stdout.flush()