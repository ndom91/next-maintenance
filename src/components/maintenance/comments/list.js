import { useState, useEffect } from "react"
import Comment from "./comment"
import Notify from "@/newtelco-utils/notification"
import {
  List,
  FlexboxGrid,
  Loader,
  Divider,
  Input,
  IconButton,
  Icon,
} from "rsuite"

const CommentList = ({ user, id, initialComment }) => {
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState([])

  useEffect(() => {
    if (id === "NEW") {
      return
    }
    fetch(`/api/comments?m=${id}`)
      .then((resp) => resp.json())
      .then((data) => {
        let { comments } = data
        const now = new Date()
        if (initialComment) {
          comments.push({
            user: "ndomino@newtelco.de",
            datetime: now.toISOString(),
            body: initialComment,
          })
        }
        if (data.comments.length > 0) {
          const newComments = reverseArrayInPlace(comments)
          setComments(newComments)
        } else {
          setComments(comments)
        }
      })
      .catch((err) => console.error(err))
  }, [id, initialComment])

  useEffect(() => {
    if (initialComment) {
      const newComments = comments
      const now = new Date()
      newComments.unshift({
        user: "ndomino@newtelco.de",
        datetime: now.toISOString(),
        body: initialComment,
      })
      setComments(newComments)
    }
  }, [comments, initialComment])

  const reverseArrayInPlace = (arr) => {
    for (var i = 0; i <= arr.length / 2; i++) {
      const el = arr[i]
      arr[i] = arr[arr.length - 1 - i]
      arr[arr.length - 1 - i] = el
    }
    return arr
  }

  const submitComment = () => {
    if (!comment) return Notify("error", "No Comment")

    fetch("/api/comments", {
      method: "POST",
      body: JSON.stringify({
        comment,
        user,
        id,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((r) => r.json())
      .then((resp) => {
        if (resp.id) {
          const newComments = comments
          const now = new Date()
          newComments.unshift({
            user: user,
            datetime: now.toISOString(),
            body: comment,
            id: resp.id,
          })
          setComments(newComments)
          setComment("")
          Notify("success", "Comment Posted")
        }
      })
      .catch((err) => {
        Notify("error", "Post Error", err)
      })
  }

  const deleteComment = (commentId) => {
    fetch("/api/comments", {
      method: "DELETE",
      body: JSON.stringify({
        id: commentId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((r) => r.json())
      .then((resp) => {
        if (resp.id) {
          const newComments = comments.filter((el) => el.id !== commentId)
          setComments(newComments)
          Notify("success", "Comment Deleted")
        }
      })
      .catch((err) => {
        Notify("error", "Delete Error", err)
      })
  }

  return (
    <FlexboxGrid
      style={{ flexDirection: "column", alignItems: "center" }}
      align="middle"
    >
      <FlexboxGrid.Item colspan={22}>
        <Divider />
      </FlexboxGrid.Item>
      <FlexboxGrid.Item style={{ marginBottom: "10px" }} colspan={22}>
        <div
          style={{
            fontSize: "1.5rem",
            fontWeight: "100",
            fontFamily: "var(--font-body)",
          }}
        >
          Comments
        </div>
      </FlexboxGrid.Item>
      <FlexboxGrid.Item colspan={22}>
        <FlexboxGrid justify="space-between" align="middle">
          <FlexboxGrid.Item colspan={19}>
            <Input value={comment} onChange={(e) => setComment(e)} />
          </FlexboxGrid.Item>
          <FlexboxGrid.Item colspan={4} style={{ marginLeft: "5px" }}>
            <IconButton
              style={{ width: "100%", minWidth: "100px" }}
              icon={<Icon icon="send" />}
              onClick={submitComment}
            >
              Submit
            </IconButton>
          </FlexboxGrid.Item>
        </FlexboxGrid>
      </FlexboxGrid.Item>
      <FlexboxGrid.Item colspan={22}>
        <List style={{ marginTop: "15px" }} hover bordered>
          {!comments ? (
            <div
              style={{
                width: "100%",
                height: "100px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Loader />
            </div>
          ) : comments.length > 0 ? (
            comments.map((comm) => {
              return (
                <List.Item key={comm.id}>
                  <Comment data={comm} handleDelete={deleteComment} />
                </List.Item>
              )
            })
          ) : (
            <List.Item>No Comments Yet</List.Item>
          )}
        </List>
      </FlexboxGrid.Item>
    </FlexboxGrid>
  )
}

export default CommentList
